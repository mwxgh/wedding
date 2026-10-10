import { customAlphabet } from 'nanoid';

// No look-alike characters (0/O, 1/l/I) so codes are easy to read aloud
export const generateInvitationCode = customAlphabet(
  '23456789abcdefghjkmnpqrstuvwxyz',
  10,
);
