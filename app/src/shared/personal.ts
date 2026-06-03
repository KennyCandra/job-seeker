export function getPersonalData() {
  return {
    name: process.env.PERSONAL_NAME || "Ahmed Abdelrahman",
    email: process.env.PERSONAL_EMAIL || "ahmedabdelrhaman232@gmail.com",
    phone: process.env.PERSONAL_PHONE || "+201024180920",
    location: process.env.PERSONAL_LOCATION || "Cairo, Egypt (UTC+3)",
    linkedin: process.env.PERSONAL_LINKEDIN || "https://linkedin.com/in/ahmed-abdelrahman",
    portfolio: process.env.PERSONAL_PORTFOLIO || "https://kennycandra.dev",
  };
}
