export function getPetClass(
  action: number,
  social: number,
  commerce: number
) {
  if (action > social && action > commerce) {
    return "Grinder Beast";
  }

  if (social > action && social > commerce) {
    return "Influencer Spirit";
  }

  return "Merchant King";
}