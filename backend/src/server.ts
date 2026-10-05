// import app from "./app.js";

// const PORT = process.env.PORT ?? 5000;

// app.listen(PORT, () => {
//   console.log(`OrgImpact API running on port ${PORT}`);
// });



import app from "./app.js";
import { prisma } from "./lib/prisma.js";

const PORT = process.env.PORT ?? 5000;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`OrgImpact API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }
}

startServer();