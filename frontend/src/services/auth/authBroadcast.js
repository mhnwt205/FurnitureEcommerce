const CHANNEL_NAME = 'heritage-home-auth';

export const AUTH_BROADCAST_EVENTS = Object.freeze({
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED'
});

const supportsBroadcastChannel = () => (
  typeof window !== 'undefined' && 'BroadcastChannel' in window
);

const isKnownEvent = (type) => Object.values(AUTH_BROADCAST_EVENTS).includes(type);

let outboundChannel = null;

const getOutboundChannel = () => {
  if (!outboundChannel && supportsBroadcastChannel()) {
    outboundChannel = new BroadcastChannel(CHANNEL_NAME);
  }
  return outboundChannel;
};

export const broadcastAuthEvent = (type) => {
  if (!isKnownEvent(type)) return;
  getOutboundChannel()?.postMessage({ type });
};

export const closeAuthBroadcast = () => {
  outboundChannel?.close();
  outboundChannel = null;
};

export const subscribeAuthBroadcast = (listener) => {
  if (!supportsBroadcastChannel()) return () => {};

  const channel = new BroadcastChannel(CHANNEL_NAME);
  const onMessage = (event) => {
    const type = event?.data?.type;
    if (isKnownEvent(type)) listener(type);
  };

  channel.addEventListener('message', onMessage);
  return () => {
    channel.removeEventListener('message', onMessage);
    channel.close();
  };
};