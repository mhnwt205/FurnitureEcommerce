import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../prismaClient.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/emailService.js';
import { OAuth2Client } from 'google-auth-library';
import {
  buildAuthPayload,
  getAuthUserById,
  getAuthUserByEmail,
  getRequestAuthMetadata,
  issueAuthSession,
  userAuthInclude
} from '../services/authSession.service.js';
import {
  findRefreshSessionByRawToken,
  revokeAllUserSessions,
  revokeRefreshFamily,
  revokeRefreshSession,
  rotateRefreshSession
} from '../services/refreshSession.service.js';
import { clearRefreshCookie, getRefreshTokenFromRequest, setRefreshCookie } from '../utils/authCookie.js';
import { AuthTokenError, REFRESH_TOKEN_ERROR_CODES } from '../utils/authErrors.js';

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

const refreshErrorResponse = (res, error) => {
  clearRefreshCookie(res);

  if (error instanceof AuthTokenError) {
    if (error.code === REFRESH_TOKEN_ERROR_CODES.USER_INACTIVE) {
      return res.status(403).json({ message: 'Account is locked' });
    }

    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }

  console.error('Refresh token flow failed.');
  return res.status(500).json({ message: 'Internal server error' });
};

const sendLoginResponse = async ({ req, res, user, message = 'Login successful' }) => {
  const authSession = await issueAuthSession({ user, req });
  setRefreshCookie(res, authSession.refreshToken);

  return res.status(200).json({
    message,
    token: authSession.token,
    accessToken: authSession.accessToken,
    user: authSession.user
  });
};

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
      console.error('Failed to send verification email.');
      return res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
    }

    const message = emailMode === 'SMTP_MODE'
      ? 'Dang ky thanh cong. Email xac thuc da duoc gui.'
      : 'Dang ky thanh cong. [DEV MODE] Cau hinh SMTP de gui email xac thuc.';

    res.status(201).json({ message, userId: newUser.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Register request failed.');
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    const user = await getAuthUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Tai khoan cua ban da bi khoa. Vui long lien he quan tri vien.' });
    }

    if (user.role !== 'admin' && !user.emailVerified) {
      return res.status(403).json({ message: 'Tai khoan chua xac thuc email. Vui long kiem tra email.' });
    }

    return sendLoginResponse({ req, res, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Login request failed.');
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
      return res.status(400).json({ message: 'Token xac thuc khong hop le, da het han, hoac email da duoc xac thuc.' });
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
    console.error('Email verification request failed.');
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
      include: userAuthInclude
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          fullName: name || 'Google User',
          email,
          emailVerified: true,
          provider: 'google',
          googleId,
          avatarUrl: picture,
          role: 'customer'
        },
        include: userAuthInclude
      });
    } else {
      const updateData = {};
      if (!user.googleId) {
        updateData.googleId = googleId;
        updateData.provider = 'google';
      }
      if (!user.avatarUrl && picture) {
        updateData.avatarUrl = picture;
      }
      if (!user.emailVerified) {
        updateData.emailVerified = true;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: userAuthInclude
        });
      }
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Tai khoan cua ban da bi khoa. Vui long lien he quan tri vien.' });
    }

    return sendLoginResponse({ req, res, user });
  } catch (error) {
    console.error('Google login request failed.');
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refresh = async (req, res) => {
  const rawRefreshToken = getRefreshTokenFromRequest(req);
  if (!rawRefreshToken) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'Refresh token is missing' });
  }

  try {
    const rotated = await rotateRefreshSession(rawRefreshToken, getRequestAuthMetadata(req));
    const user = await getAuthUserById(rotated.session.userId);

    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      await revokeRefreshFamily(rotated.session.familyId);
      clearRefreshCookie(res);
      return res.status(403).json({ message: 'Account is locked' });
    }

    const authPayload = buildAuthPayload({
      user,
      sessionId: rotated.session.id
    });

    setRefreshCookie(res, rotated.rawToken);

    return res.status(200).json(authPayload);
  } catch (error) {
    return refreshErrorResponse(res, error);
  }
};

export const logout = async (req, res) => {
  const rawRefreshToken = getRefreshTokenFromRequest(req);

  try {
    if (rawRefreshToken) {
      const session = await findRefreshSessionByRawToken(rawRefreshToken);
      if (session?.id) {
        await revokeRefreshSession(session.id);
      }
    }
  } catch (error) {
    if (!(error instanceof AuthTokenError)) {
      console.error('Logout request failed.');
    }
  }

  clearRefreshCookie(res);
  return res.status(200).json({ message: 'Logout successful' });
};

export const logoutAll = async (req, res) => {
  try {
    await revokeAllUserSessions(req.user.id);
    clearRefreshCookie(res);
    return res.status(200).json({ message: 'Logged out from all sessions' });
  } catch (error) {
    console.error('Logout-all request failed.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await getAuthUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is locked' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Authenticated user lookup failed.');
    return res.status(500).json({ message: 'Internal server error' });
  }
};
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.provider === 'google') {
      return res.status(400).json({ message: 'Tai khoan dang nhap bang Google khong the doi mat khau.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mat khau hien tai khong dung' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mat khau moi phai tu 6 ky tu tro len' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      await revokeAllUserSessions(userId, tx);
    });

    clearRefreshCookie(res);
    res.status(200).json({ message: 'Doi mat khau thanh cong' });
  } catch (error) {
    console.error('Change password request failed.');
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Return 200 even if not found to prevent email enumeration
      return res.status(200).json({ message: 'Neu email ton tai trong he thong, lien ket dat lai mat khau da duoc gui.' });
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
      console.error('Failed to send password reset email.');
      return res.status(500).json({ message: 'Loi khi gui email dat lai mat khau. Vui long thu lai sau.' });
    }

    res.status(200).json({ message: 'Neu email ton tai trong he thong, lien ket dat lai mat khau da duoc gui.' });
  } catch (error) {
    console.error('Forgot password request failed.');
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Thieu thong tin' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Mat khau xac nhan khong khop' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mat khau moi phai tu 6 ky tu tro len' });
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
      return res.status(400).json({ message: 'Lien ket dat lai mat khau khong hop le hoac da het han.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Transaction to update user, invalidate reset tokens, and revoke refresh sessions.
    await prisma.$transaction(async (tx) => {
      const usedAt = new Date();

      await tx.user.update({
        where: { id: resetTokenRecord.userId },
        data: {
          passwordHash: passwordHash
        }
      });

      await tx.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: {
          usedAt
        }
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetTokenRecord.userId,
          usedAt: null,
          id: { not: resetTokenRecord.id }
        },
        data: {
          usedAt
        }
      });

      await revokeAllUserSessions(resetTokenRecord.userId, tx);
    });

    clearRefreshCookie(res);
    res.status(200).json({ message: 'Dat lai mat khau thanh cong. Vui long dang nhap lai.' });
  } catch (error) {
    console.error('Reset password request failed.');
    res.status(500).json({ message: 'Internal server error' });
  }
};
