import { db } from "../server/db";
import { users, jobApplications } from "../shared/schema";
import { hashPassword } from "../server/auth";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create demo users
    const adminPasswordHash = await hashPassword("admin123");
    const empPasswordHash = await hashPassword("emp123");
    const clientPasswordHash = await hashPassword("client123");

    // Insert users
    const [admin] = await db
      .insert(users)
      .values({
        name: "Admin User",
        email: "admin@aplyease.com",
        role: "ADMIN",
        company: "AplyEase",
        passwordHash: adminPasswordHash,
      })
      .returning();

    const [employee] = await db
      .insert(users)
      .values({
        name: "John Employee",
        email: "employee@aplyease.com",
        role: "EMPLOYEE",
        company: "AplyEase",
        passwordHash: empPasswordHash,
      })
      .returning();

    const [client] = await db
      .insert(users)
      .values({
        name: "Arshad",
        email: "arshad@client.com",
        role: "CLIENT",
        company: "Client Company",
        passwordHash: clientPasswordHash,
      })
      .returning();

    console.log("✅ Users created successfully");

    // Create sample job applications based on the spreadsheet data
    const applications = [
      {
        clientId: client.id,
        employeeId: employee.id,
        dateApplied: "2025-08-15",
        appliedByName: "Arshad",
        jobTitle: "Data Scientist, I",
        companyName: "Starbucks",
        location: "Seattle, WA",
        portalName: "Job Right",
        jobLink: "https://jobright.ai",
        jobPage: "https://apply.starbucks.com",
        resumeUrl: "https://drive.google.com/file/d/resume1",
        status: "Applied" as const,
        mailSent: true,
      },
      {
        clientId: client.id,
        employeeId: employee.id,
        dateApplied: "2025-08-15",
        appliedByName: "Arshad",
        jobTitle: "Machine Learning Engineer",
        companyName: "Meta",
        location: "Remote - United States",
        portalName: "Job Right",
        jobLink: "https://jobright.ai",
        jobPage: "https://careers.meta.com",
        resumeUrl: "https://drive.google.com/file/d/resume2",
        status: "Screening" as const,
        mailSent: true,
      },
      {
        clientId: client.id,
        employeeId: employee.id,
        dateApplied: "2025-08-15",
        appliedByName: "Arshad",
        jobTitle: "Software Developer",
        companyName: "AMD",
        location: "San Jose, CA",
        portalName: "Job Right",
        jobLink: "https://jobright.ai",
        jobPage: "https://careers.amd.com",
        resumeUrl: "https://drive.google.com/file/d/resume3",
        status: "Interview" as const,
        mailSent: true,
      },
      {
        clientId: client.id,
        employeeId: employee.id,
        dateApplied: "2025-08-15",
        appliedByName: "Arshad",
        jobTitle: "Manager - Data",
        companyName: "Capital One",
        location: "McLean, VA",
        portalName: "Job Right",
        jobLink: "https://jobright.ai",
        jobPage: "https://capitalonecareers.com",
        resumeUrl: "https://drive.google.com/file/d/resume4",
        status: "Applied" as const,
        mailSent: true,
      },
      {
        clientId: client.id,
        employeeId: employee.id,
        dateApplied: "2025-08-15",
        appliedByName: "Arshad",
        jobTitle: "AI/ML Software Engineer",
        companyName: "TradeNetwork",
        location: "Atlanta, GA",
        portalName: "Job Right",
        jobLink: "https://jobright.ai",
        jobPage: "https://tradenetwork.com/careers",
        resumeUrl: "https://drive.google.com/file/d/resume5",
        status: "Offer" as const,
        mailSent: true,
      },
    ];

    await db.insert(jobApplications).values(applications);

    console.log("✅ Sample job applications created successfully");
    console.log("🎉 Database seeded successfully!");
    console.log("\nDemo credentials:");
    console.log("Admin: admin@aplyease.com / admin123");
    console.log("Employee: employee@aplyease.com / emp123");
    console.log("Client: arshad@client.com / client123");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });