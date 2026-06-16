import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../prismaClient.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  address: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const register = async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { fullName, email, password, phone, address } = validatedData;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate email verification token (raw for email, hashed for DB)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        phone,
        address,
        emailVerified: false,
        emailVerificationToken: hashedToken,
        emailVerificationExpires: verificationExpires
      }
    });

    let emailMode;
    try {
      // Send email
      emailMode = await sendVerificationEmail(email, rawToken);
    } catch (emailError) {
      // Rollback user creation
      await prisma.user.delete({ where: { id: newUser.id } });
      return res.status(500).json({ message: emailError.message || 'Lỗi gửi email xác thực. Vui lòng thử lại sau.' });
    }

    const message = emailMode === 'SMTP_MODE' 
      ? 'Đăng ký thành công. Email xác thực đã được gửi.' 
      : 'Đăng ký thành công. [DEV MODE] Link xác thực đã được in trong terminal.';

    res.status(201).json({ message, userId: newUser.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userPermissions: {
          select: {
            permission: {
              select: { key: true }
            }
          }
        }
      }
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is locked
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    }

    // Check email verification
    if (user.role !== 'admin' && !user.emailVerified) {
      return res.status(403).json({ message: 'Tài khoản chưa xác thực email. Vui lòng kiểm tra email.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const { passwordHash, emailVerificationToken, emailVerificationExpires, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token is missing' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
          gt: new Date() // Must not be expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token xác thực không hợp lệ, đã hết hạn, hoặc email đã được xác thực trước đó.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Credential token is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || '935475267165-3hst9j98c0c6vmm98pec4ie43iecup53.apps.googleusercontent.com';

    // Verify token using official Google library
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }

    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;
    const googleId = payload.sub;

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        userPermissions: {
          select: {
            permission: {
              select: { key: true }
            }
          }
        }
      }
    });

    if (!user) {
      // Create a new user
      user = await prisma.user.create({
        data: {
          fullName: name || 'Google User',
          email: email,
          emailVerified: true,
          provider: 'google',
          googleId: googleId,
          avatarUrl: picture,
          role: 'customer' // Only customer, no admin creation
        }
      });
    } else {
      // User exists. Link account if not already linked
      const updateData = {};
      if (!user.googleId) {
        updateData.googleId = googleId;
        updateData.provider = 'google';
      }
      if (!user.avatarUrl && picture) {
        updateData.avatarUrl = picture;
      }
      // If we are linking the account, verify email as well since Google has verified it
      if (!user.emailVerified) {
        updateData.emailVerified = true;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
      }
    }

    // Check if account is locked
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Omit sensitive fields
    const { passwordHash, emailVerificationToken, emailVerificationExpires, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.provider === 'google') {
      return res.status(400).json({ message: 'Tài khoản đăng nhập bằng Google không thể đổi mật khẩu.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    res.status(200).json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Return 200 even if not found to prevent email enumeration
      return res.status(200).json({ message: 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedToken,
        expiresAt: resetExpires
      }
    });

    try {
      await sendPasswordResetEmail(email, rawToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ message: emailError.message || 'Lỗi khi gửi email đặt lại mật khẩu. Vui lòng thử lại sau.' });
    }

    res.status(200).json({ message: 'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Thiếu thông tin' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu xác nhận không khớp' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const resetTokenRecord = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hashedToken,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetTokenRecord) {
      return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Transaction to update user and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: {
          passwordHash: passwordHash
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: {
          usedAt: new Date()
        }
      }),
      // Invalidate other active tokens for this user
      prisma.passwordResetToken.updateMany({
        where: {
          userId: resetTokenRecord.userId,
          usedAt: null,
          id: { not: resetTokenRecord.id }
        },
        data: {
          usedAt: new Date()
        }
      })
    ]);

    res.status(200).json({ message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
