export const config = {
  database: {
    url: process.env.DATABASE_URL,
  },

  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    version: "v1",
  },

  auth: {
    secret: process.env.NEXTAUTH_SECRET,
  },

  features: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    enableTherapistSharing: true,
  },

  limits: {
    maxNoteLength: 500,
    maxMoodsPerDay: 10,
  },
};
