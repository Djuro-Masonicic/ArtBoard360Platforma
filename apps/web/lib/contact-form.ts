export type ContactTopic = "services" | "support" | "other";
export type ContactValues = { fullName: string; email: string; message: string; website: string };
export type ContactErrors = Partial<Record<"fullName" | "email" | "message", string>>;
export const contactTopics: Array<{ id: ContactTopic; label: string }> = [{ id: "services", label: "Usluge" }, { id: "support", label: "Podrška" }, { id: "other", label: "Ostalo" }];
export const emptyContact = (): ContactValues => ({ fullName: "", email: "", message: "", website: "" });
export function validateContact(values: ContactValues): ContactErrors {
  const name = values.fullName.trim(), email = values.email.trim(), message = values.message.trim();
  const errors: ContactErrors = {};
  if (Array.from(name).length < 2 || Array.from(name).length > 120 || !/\p{L}/u.test(name) || /[\u0000-\u001f\u007f]/u.test(name)) errors.fullName = "Unesi ime i prezime (2–120 znakova).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length > 254) errors.email = "Unesi važeću e-mail adresu.";
  if (Array.from(message).length < 10 || Array.from(message).length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(message)) errors.message = "Poruka mora imati od 10 do 5.000 znakova.";
  return errors;
}
