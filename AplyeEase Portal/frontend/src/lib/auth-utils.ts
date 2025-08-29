export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*/.test(error.message);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map(part => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const statusColors = {
    Applied: "bg-blue-100 text-blue-800",
    Screening: "bg-purple-100 text-purple-800",
    Interview: "bg-yellow-100 text-yellow-800",
    Offer: "bg-orange-100 text-orange-800",
    Hired: "bg-emerald-100 text-emerald-800",
    Rejected: "bg-red-100 text-red-800",
    "On Hold": "bg-gray-100 text-gray-800",
  };
  
  return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
}

export function getRoleColor(role: string): string {
  const roleColors = {
    ADMIN: "bg-red-100 text-red-800",
    CLIENT: "bg-green-100 text-green-800",
    EMPLOYEE: "bg-blue-100 text-blue-800",
  };
  
  return roleColors[role as keyof typeof roleColors] || "bg-gray-100 text-gray-800";
}
