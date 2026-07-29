/** @type {import('@ladle/react').UserConfig} */
export default {
  host: process.env.LADLE_HOST ?? '0.0.0.0',
  port: Number(process.env.LADLE_PORT) || 61000,
};
