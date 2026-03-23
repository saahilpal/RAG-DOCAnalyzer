const { z } = require('zod');

const googleAuthSchema = z.object({
  idToken: z.string().trim().min(1, 'Firebase ID token is required.'),
});

module.exports = {
  googleAuthSchema,
};
