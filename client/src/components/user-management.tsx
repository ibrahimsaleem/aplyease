import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Search, Trash2, Users, Sparkles, UserCheck, Clock, AlertCircle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getInitials, getRoleColor } from "@/lib/auth-utils";
import type { User } from "@/types";

// Currency input component that allows free typing
function CurrencyInput({
  value,
  onChange,
  ...props
}: {
  value: number | undefined;
  onChange: (cents: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  // Keep local text state for free typing
  const [localValue, setLocalValue] = useState(() => {
    return value !== undefined && value > 0 ? (value / 100).toString() : "";
  });

  // Sync local value when form value changes externally (e.g., form reset)
  useEffect(() => {
    const formattedValue = value !== undefined && value > 0 ? (value / 100).toString() : "";
    // Only update if the values are actually different (avoid cursor jumping)
    const currentCents = parseFloat(localValue || "0") * 100;
    if (Math.round(currentCents) !== (value || 0)) {
      setLocalValue(formattedValue);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty, numbers, and one decimal point with up to 2 decimal places
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setLocalValue(val);
      const numVal = parseFloat(val || "0");
      onChange(isNaN(numVal) ? 0 : Math.round(numVal * 100));
    }
  };

  const handleBlur = () => {
    // Format the value on blur (e.g., "50." becomes "50")
    if (localValue && localValue !== "") {
      const numVal = parseFloat(localValue);
      if (!isNaN(numVal) && numVal > 0) {
        // Remove trailing zeros and unnecessary decimal point
        setLocalValue(numVal.toString());
      } else {
        setLocalValue("");
      }
    }
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder="0"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}

// Schema for creating new users - password is required
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "CLIENT", "EMPLOYEE"], { required_error: "Role is required" }),
  company: z.string().optional(),
  whatsappNumber: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  applicationsRemaining: z.coerce.number().int().min(0).optional(),
  amountPaid: z.coerce.number().int().min(0).optional(),
  amountDue: z.coerce.number().int().min(0).optional(),
}).refine((data) => {
  if (data.role === "EMPLOYEE") {
    // Check if whatsappNumber exists and has minimum length
    return !!data.whatsappNumber && data.whatsappNumber.length >= 10;
  }
  return true;
}, {
  message: "WhatsApp number is required (include country code)",
  path: ["whatsappNumber"],
});

// Schema for editing existing users - password is optional
const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "CLIENT", "EMPLOYEE"], { required_error: "Role is required" }),
  company: z.string().optional(),
  whatsappNumber: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  applicationsRemaining: z.coerce.number().int().min(0).optional(),
  amountPaid: z.coerce.number().int().min(0).optional(),
  amountDue: z.coerce.number().int().min(0).optional(),
}).refine((data) => {
  if (data.role === "EMPLOYEE") {
    // Check if whatsappNumber exists and has minimum length
    return !!data.whatsappNumber && data.whatsappNumber.length >= 10;
  }
  return true;
}, {
  message: "WhatsApp number is required (include country code)",
  path: ["whatsappNumber"],
});

type UserFormData = z.infer<typeof createUserSchema>;

const CREDIT_PLANS = [
  { name: "Starter", credits: 25, price: 25 },
  { name: "Basic", credits: 50, price: 40 },
  { name: "Standard", credits: 100, price: 70 },
  { name: "Pro", credits: 250, price: 150 },
  { name: "Unlimited", credits: 500, price: 250 },
];

export function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [managingEmployeesClient, setManagingEmployeesClient] = useState<User | null>(null);
  const [creditsDialogUser, setCreditsDialogUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [customCredits, setCustomCredits] = useState<string>("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userTab, setUserTab] = useState<"employees" | "clients">("employees");

  const form = useForm<UserFormData>({
    // Don't use resolver here - we'll validate manually in onSubmit
    defaultValues: {
      name: "",
      email: "",
      role: "EMPLOYEE",
      company: "",
      whatsappNumber: "",
      password: "",
      applicationsRemaining: 0,
      amountPaid: 0,
      amountDue: 0,
    },
  });

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users", { search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      const res = await apiRequest("GET", `/api/users?${params.toString()}`);
      return res.json();
    },
    enabled: user?.role === "ADMIN", // Only fetch if user is an admin
    retry: false, // Don't retry on permission errors
  });

  const createUser = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserFormData> }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const disableUser = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/users/${id}/disable`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User disabled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable user",
        variant: "destructive",
      });
    },
  });

  const enableUser = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/users/${id}/enable`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User enabled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enable user",
        variant: "destructive",
      });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const addResumeCredits = useMutation({
    mutationFn: async ({ userId, credits, plan }: { userId: string; credits: number; plan: string }) => {
      const response = await apiRequest("POST", `/api/users/${userId}/resume-credits`, { credits, plan });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Resume credits added successfully",
      });
      setCreditsDialogUser(null);
      setSelectedPlan("");
      setCustomCredits("");
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add resume credits",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    // Validate with the appropriate schema
    const schema = editingUser ? editUserSchema : createUserSchema;
    const validation = schema.safeParse(data);

    if (!validation.success) {
      // Show validation errors
      validation.error.errors.forEach((error) => {
        form.setError(error.path[0] as any, {
          type: "manual",
          message: error.message,
        });
      });
      return;
    }

    // Prepare data with proper types
    const submitData = {
      ...data,
      // Convert applicationsRemaining to number if it exists
      applicationsRemaining: data.applicationsRemaining
        ? Number(data.applicationsRemaining)
        : undefined,
      // Convert payment fields to numbers if they exist
      amountPaid: data.amountPaid !== undefined
        ? Number(data.amountPaid)
        : undefined,
      amountDue: data.amountDue !== undefined
        ? Number(data.amountDue)
        : undefined,
    };

    if (editingUser) {
      // Remove password from update if it's empty
      const updateData: Partial<UserFormData> = { ...submitData };
      if (!updateData.password) {
        delete (updateData as any).password;
      }
      updateUser.mutate({ id: editingUser.id, data: updateData });
    } else {
      createUser.mutate(submitData);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company || "",
      whatsappNumber: user.whatsappNumber || "",
      password: "", // Don't populate password for editing
      applicationsRemaining: (user as any).applicationsRemaining ?? 0,
      amountPaid: (user as any).amountPaid ?? 0,
      amountDue: (user as any).amountDue ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    const action = user.isActive ? "disable" : "enable";
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      if (user.isActive) {
        disableUser.mutate(user.id);
      } else {
        enableUser.mutate(user.id);
      }
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setDeleteConfirmation("");
  };

  const confirmDelete = () => {
    if (deletingUser) {
      deleteUser.mutate(deletingUser.id);
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    form.reset();
    setIsDialogOpen(true);
  };

  // Guard: Only admins can access user management
  if (user?.role !== "ADMIN") {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-600">
            <p className="text-lg font-semibold mb-2">Access Denied</p>
            <p>You don't have permission to manage users. This feature is only available to administrators.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  // Show error message if there's a permission error
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p className="text-lg font-semibold mb-2">Error Loading Users</p>
            <p>{(error as any)?.message || "Failed to load users. Please try again."}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <div className="flex gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search users..."
                className="pl-10 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-users"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewUser} data-testid="button-add-user">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? "Edit User" : "Add New User"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-user-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-user-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-user-role">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="CLIENT">Client</SelectItem>
                              <SelectItem value="EMPLOYEE">Employee</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-user-company" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* WhatsApp Number (for EMPLOYEE only) */}
                    {form.watch("role") === "EMPLOYEE" && (
                      <FormField
                        control={form.control}
                        name="whatsappNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+91 98765 43210"
                                {...field}
                                data-testid="input-user-whatsapp"
                              />
                            </FormControl>
                            <p className="text-xs text-slate-500">Include country code for client contact</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Applications Left (for CLIENT only) */}
                    {form.watch("role") === "CLIENT" && (
                      <FormField
                        control={form.control}
                        name="applicationsRemaining"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Applications Left</FormLabel>
                            <FormControl>
                              <Input type="number" min={0} {...field} data-testid="input-user-apps-left" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Payment fields (for CLIENT only) */}
                    {form.watch("role") === "CLIENT" && (
                      <>
                        <FormField
                          control={form.control}
                          name="amountPaid"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount Paid ($)</FormLabel>
                              <FormControl>
                                <CurrencyInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  data-testid="input-user-amount-paid"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="amountDue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount Due ($)</FormLabel>
                              <FormControl>
                                <CurrencyInput
                                  value={field.value}
                                  onChange={field.onChange}
                                  data-testid="input-user-amount-due"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Password {editingUser && "(leave empty to keep current)"}
                          </FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-user-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUser.isPending || updateUser.isPending}
                        data-testid="button-save-user"
                      >
                        {editingUser ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      {/* Pending Employee Approvals Alert - Last 7 days only */}
      {(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const pendingEmployees = users.filter(u =>
          u.role === "EMPLOYEE" &&
          !u.isActive &&
          new Date(u.createdAt) >= sevenDaysAgo
        );
        if (pendingEmployees.length === 0) return null;
        return (
          <div className="mx-6 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">
                Pending Employee Approvals ({pendingEmployees.length})
              </h3>
            </div>
            <div className="space-y-2">
              {pendingEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between bg-white p-3 rounded-md border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-medium">{getInitials(emp.name)}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{emp.name}</p>
                      <p className="text-sm text-slate-500">{emp.email}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 ml-2">
                      <Clock className="w-3 h-3" />
                      <span>Joined {new Date(emp.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {emp.whatsappNumber && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white border-none"
                        title="Contact on WhatsApp"
                        onClick={() => window.open(`https://wa.me/${emp.whatsappNumber!.replace(/[^0-9+]/g, '')}?text=Hi%20${encodeURIComponent(emp.name)},%20regarding%20your%20application%20to%20HireEase...`, '_blank')}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(emp)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => enableUser.mutate(emp.id)}
                      disabled={enableUser.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <CardContent className="p-0">
        <Tabs value={userTab} onValueChange={(v) => setUserTab(v as "employees" | "clients")} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="employees">
                Employees ({users.filter(u => u.role === "EMPLOYEE").length})
              </TabsTrigger>
              <TabsTrigger value="clients">
                Clients ({users.filter(u => u.role === "CLIENT").length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="employees" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter(u => u.role === "EMPLOYEE").map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-blue-100">
                            <span className="font-medium text-blue-600" data-testid="text-user-initials">
                              {getInitials(user.name)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900" data-testid="text-user-name">
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid="text-user-email">{user.email}</TableCell>
                      <TableCell>
                        {user.whatsappNumber ? (
                          <span className="text-sm text-slate-600">{user.whatsappNumber}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} data-testid="badge-user-status">
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid="text-user-created">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} data-testid="button-edit-user">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Switch checked={user.isActive} onCheckedChange={() => handleToggleStatus(user)} data-testid="switch-user-status" />
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="text-red-500 hover:text-red-700 hover:bg-red-50" data-testid="button-delete-user">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!users.filter(u => u.role === "EMPLOYEE").length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-slate-500">No employees found.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Apps Left</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter(u => u.role === "CLIENT").map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4 bg-green-100">
                            <span className="font-medium text-green-600" data-testid="text-user-initials">
                              {getInitials(user.name)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900" data-testid="text-user-name">
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid="text-user-email">{user.email}</TableCell>
                      <TableCell data-testid="text-user-company">{user.company || "-"}</TableCell>
                      <TableCell data-testid="text-user-apps-left">
                        {(user as any).applicationsRemaining ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} data-testid="badge-user-status">
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid="text-user-created">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => setManagingEmployeesClient(user)} title="Manage Employees" data-testid="button-manage-employees">
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setCreditsDialogUser(user)} title="Add Resume Credits" data-testid="button-resume-credits">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} data-testid="button-edit-user">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Switch checked={user.isActive} onCheckedChange={() => handleToggleStatus(user)} data-testid="switch-user-status" />
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="text-red-500 hover:text-red-700 hover:bg-red-50" data-testid="button-delete-user">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!users.filter(u => u.role === "CLIENT").length && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-slate-500">No clients found.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              <span className="font-semibold"> {deletingUser?.name} </span>
              and all associated data including client profiles and job applications.
            </AlertDialogDescription>
            <div className="py-4">
              <p className="text-sm text-slate-500 mb-2">
                Please type <span className="font-mono font-bold select-all">{deletingUser?.email}</span> to confirm.
              </p>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type user email to confirm"
                data-testid="input-delete-confirmation"
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteConfirmation !== deletingUser?.email}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-confirm-delete"
            >
              {deleteUser.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Dialog open={!!creditsDialogUser} onOpenChange={(open) => !open && setCreditsDialogUser(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Resume Credits - {creditsDialogUser?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Current Resume Credits</p>
              <p className="text-2xl font-bold text-purple-700">{(creditsDialogUser as any)?.resumeCredits ?? 0}</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Plan</label>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {CREDIT_PLANS.map((plan) => (
                  <Card
                    key={plan.name}
                    className={`cursor-pointer transition-all ${selectedPlan === plan.name ? 'ring-2 ring-purple-600 bg-purple-50' : 'hover:shadow-md'
                      }`}
                    onClick={() => {
                      setSelectedPlan(plan.name);
                      setCustomCredits("");
                    }}
                  >
                    <CardHeader className="p-4">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <div className="text-2xl font-bold text-primary">${plan.price}</div>
                      <p className="text-xs text-slate-600">{plan.credits} credits</p>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Or Enter Custom Credits</label>
              <Input
                type="number"
                placeholder="Enter number of credits"
                value={customCredits}
                onChange={(e) => {
                  setCustomCredits(e.target.value);
                  setSelectedPlan("");
                }}
                min="1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreditsDialogUser(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const plan = CREDIT_PLANS.find(p => p.name === selectedPlan);
                  const credits = customCredits ? parseInt(customCredits) : plan?.credits;
                  if (credits && credits > 0 && creditsDialogUser) {
                    addResumeCredits.mutate({
                      userId: creditsDialogUser.id,
                      credits,
                      plan: selectedPlan || 'Custom'
                    });
                  }
                }}
                disabled={addResumeCredits.isPending || (!selectedPlan && !customCredits)}
              >
                {addResumeCredits.isPending ? "Adding..." : "Add Credits"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ManageEmployeesDialog
        client={managingEmployeesClient}
        open={!!managingEmployeesClient}
        onOpenChange={(open) => !open && setManagingEmployeesClient(null)}
        allUsers={users}
      />
    </Card >
  );
}

function ManageEmployeesDialog({
  client,
  open,
  onOpenChange,
  allUsers
}: {
  client: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: User[];
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: assignedEmployees = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/clients", client?.id, "assignments"],
    queryFn: async () => {
      if (!client) return [];
      const res = await apiRequest("GET", `/api/clients/${client.id}/assignments`);
      return res.json();
    },
    enabled: !!client && open,
  });

  const assignEmployee = useMutation({
    mutationFn: async (employeeId: string) => {
      if (!client) return;
      await apiRequest("POST", `/api/clients/${client.id}/assignments`, { employeeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client?.id, "assignments"] });
      toast({ title: "Employee assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign employee", variant: "destructive" });
    }
  });

  const unassignEmployee = useMutation({
    mutationFn: async (employeeId: string) => {
      if (!client) return;
      await apiRequest("DELETE", `/api/clients/${client.id}/assignments/${employeeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", client?.id, "assignments"] });
      toast({ title: "Employee unassigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to unassign employee", variant: "destructive" });
    }
  });

  const employees = allUsers.filter(u => u.role === "EMPLOYEE" && u.isActive);
  const assignedIds = new Set(assignedEmployees.map(u => u.id));

  const handleToggle = (employeeId: string, isAssigned: boolean) => {
    if (isAssigned) {
      unassignEmployee.mutate(employeeId);
    } else {
      assignEmployee.mutate(employeeId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Employees for {client?.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="text-center">Loading assignments...</div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {employees.length === 0 ? (
                <div className="text-center text-slate-500">No active employees found.</div>
              ) : (
                employees.map(employee => {
                  const isAssigned = assignedIds.has(employee.id);
                  return (
                    <div key={employee.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-medium">
                          {getInitials(employee.name)}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{employee.name}</div>
                          <div className="text-xs text-slate-500">{employee.email}</div>
                        </div>
                      </div>
                      <Switch
                        checked={isAssigned}
                        onCheckedChange={() => handleToggle(employee.id, isAssigned)}
                        disabled={assignEmployee.isPending || unassignEmployee.isPending}
                      />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
