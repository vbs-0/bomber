import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";

// Auth
import { useAuth } from "@/hooks/use-auth";

// UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ChevronDown, 
  Send, 
  MessageCircle, 
  Check, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  Settings, 
  UserPlus,
  Users,
  ChevronUp,
  User as UserIcon,
  Flame,
  BarChart3,
  Info,
  Bell,
  Home,
  CreditCard,
  Shield,
  ShieldCheck,
  ShieldOff,
  ShieldPlus,
  Trash,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Utils
import { formatPhoneNumber, formatDate, truncateText } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Form schemas
const customMessageSchema = z.object({
  phone: z.string().min(10, "Phone number must have at least 10 digits").max(15),
  message: z.string().min(1, "Message is required").max(50, "Message cannot exceed 50 characters"),
});

const bomberSchema = z.object({
  phone: z.string().min(10, "Phone number must have at least 10 digits").max(15),
  repeat: z.number().min(1, "Minimum 1 message").max(20, "Maximum 20 messages"),
  message: z.string().max(50, "Message cannot exceed 50 characters").optional(),
});

const userActionSchema = z.object({
  username: z.string().min(3, "Username is required"),
  credits: z.number().int().min(1, "Minimum 1 credit"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const protectNumberSchema = z.object({
  phone: z.string().min(10, "Phone number must have at least 10 digits").max(15),
});

type CustomMessageFormValues = z.infer<typeof customMessageSchema>;
type BomberFormValues = z.infer<typeof bomberSchema>;
type UserActionFormValues = z.infer<typeof userActionSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
type ProtectNumberFormValues = z.infer<typeof protectNumberSchema>;

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");
  const [bomberProgress, setBomberProgress] = useState({ current: 0, total: 0 });
  const [activeTab, setActiveTab] = useState("dashboard");

  // Check authentication
  useEffect(() => {
    if (!user) {
      setLocation('/auth');
    } else if (!user.isAdmin) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  // Get all users
  const { 
    data: users = [], 
    isLoading: isLoadingUsers 
  } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  // Get dashboard stats
  const { 
    data: stats, 
    isLoading: isLoadingStats 
  } = useQuery({
    queryKey: ["/api/admin/dashboard-stats"],
    enabled: !!user?.isAdmin,
  });

  // Get all messages with type filter
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages 
  } = useQuery({
    queryKey: ["/api/admin/messages"],
    enabled: !!user?.isAdmin && activeTab === "messages",
  });

  // Get credit requests
  const { 
    data: creditRequests = [], 
    isLoading: isLoadingCreditRequests 
  } = useQuery({
    queryKey: ["/api/admin/credit-requests"],
    enabled: !!user?.isAdmin,
  });

  // Get protected numbers
  const {
    data: protectedNumbers = [],
    isLoading: isLoadingProtectedNumbers,
    refetch: refetchProtectedNumbers
  } = useQuery({
    queryKey: ["/api/admin/protected-numbers"],
    enabled: !!user?.isAdmin && activeTab === "protectedNumbers",
  });

  // Forms
  const customMessageForm = useForm<CustomMessageFormValues>({
    resolver: zodResolver(customMessageSchema),
    defaultValues: {
      phone: "",
      message: "",
    },
  });

  const bomberForm = useForm<BomberFormValues>({
    resolver: zodResolver(bomberSchema),
    defaultValues: {
      phone: "",
      repeat: 5,
      message: "",
    },
  });

  const userActionForm = useForm<UserActionFormValues>({
    resolver: zodResolver(userActionSchema),
    defaultValues: {
      username: "",
      credits: 10,
    },
  });

  const changePasswordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const protectNumberForm = useForm<ProtectNumberFormValues>({
    resolver: zodResolver(protectNumberSchema),
    defaultValues: {
      phone: "",
    },
  });

  // Mutations
  const customMessageMutation = useMutation({
    mutationFn: async (data: CustomMessageFormValues) => {
      const res = await apiRequest("POST", "/api/admin/custom-message", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Message sent",
        description: data.message,
      });
      customMessageForm.reset({ phone: "", message: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bomberMutation = useMutation({
    mutationFn: async (data: BomberFormValues) => {
      setBomberProgress({ current: 0, total: data.repeat });
      const res = await apiRequest("POST", "/api/admin/bomber", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bomber executed",
        description: data.message,
      });
      bomberForm.reset({ phone: "", repeat: 5, message: "" });
      setBomberProgress({ current: 0, total: 0 });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to execute bomber",
        description: error.message,
        variant: "destructive",
      });
      setBomberProgress({ current: 0, total: 0 });
    },
  });

  const addCreditsMutation = useMutation({
    mutationFn: async (data: UserActionFormValues) => {
      const res = await apiRequest("POST", "/api/admin/add-credits", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credits added",
        description: `Added ${data.credits} credits to user ${data.username}`,
      });
      userActionForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add credits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeCreditsMutation = useMutation({
    mutationFn: async (data: UserActionFormValues) => {
      const res = await apiRequest("POST", "/api/admin/remove-credits", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credits removed",
        description: `Removed ${data.credits} credits from user ${data.username}`,
      });
      userActionForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove credits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ username, active }: { username: string, active: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/toggle-user", { username, active });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.isActive ? "User activated" : "User deactivated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveCreditRequestMutation = useMutation({
    mutationFn: async ({ messageId, userId, credits }: { messageId: number, userId: number, credits: number }) => {
      const res = await apiRequest("POST", "/api/admin/approve-credit-request", { messageId, userId, credits });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credit request approved",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectCreditRequestMutation = useMutation({
    mutationFn: async ({ messageId }: { messageId: number }) => {
      const res = await apiRequest("POST", "/api/admin/reject-credit-request", { messageId });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credit request rejected",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credit-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/change-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
      changePasswordForm.reset();
      setShowPasswordDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const protectNumberMutation = useMutation({
    mutationFn: async (data: ProtectNumberFormValues) => {
      const res = await apiRequest("POST", "/api/admin/protect-number", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Number protected",
        description: `Phone number ${data.phone} is now protected from bomber messages`,
      });
      protectNumberForm.reset();
      refetchProtectedNumbers();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to protect number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unprotectNumberMutation = useMutation({
    mutationFn: async (data: { phone: string }) => {
      const res = await apiRequest("POST", "/api/admin/unprotect-number", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Number unprotected",
        description: `Phone number ${data.phone} is no longer protected`,
      });
      refetchProtectedNumbers();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unprotect number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const onCustomMessageSubmit = (data: CustomMessageFormValues) => {
    customMessageMutation.mutate(data);
  };

  const onBomberSubmit = (data: BomberFormValues) => {
    bomberMutation.mutate(data);
  };

  const onUserActionSubmit = (data: UserActionFormValues) => {
    if (selectedAction === "add_credits") {
      addCreditsMutation.mutate(data);
    } else if (selectedAction === "remove_credits") {
      removeCreditsMutation.mutate(data);
    }
  };

  const onChangePassword = (data: ChangePasswordFormValues) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleToggleUser = (username: string, currentStatus: boolean) => {
    toggleUserMutation.mutate({ username, active: !currentStatus });
  };

  const handleApproveCreditRequest = (messageId: number, userId: number, credits: number) => {
    approveCreditRequestMutation.mutate({ messageId, userId, credits });
  };

  const handleRejectCreditRequest = (messageId: number) => {
    rejectCreditRequestMutation.mutate({ messageId });
  };

  const handleProtectNumber = (data: ProtectNumberFormValues) => {
    protectNumberMutation.mutate(data);
  };

  const handleUnprotectNumber = (phone: string) => {
    unprotectNumberMutation.mutate({ phone });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Extract credit information from message
  const extractCreditInfo = (message: string) => {
    const creditsMatch = message.match(/Credits: (\d+)/);
    const usernameMatch = message.match(/User: ([^,]+)/);
    const reasonMatch = message.match(/Reason: (.+)$/);

    return {
      credits: creditsMatch ? parseInt(creditsMatch[1]) : 0,
      username: usernameMatch ? usernameMatch[1] : '',
      reason: reasonMatch ? reasonMatch[1] : ''
    };
  };

  // Update the user action form based on selected action
  useEffect(() => {
    if (selectedAction) {
      userActionForm.setValue("credits", 10);
    }
  }, [selectedAction, userActionForm]);

  if (!user || !user.isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-gray-900 text-white py-3 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mr-3">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Message Tool</h1>
              <div className="flex items-center">
                <span className="text-xs text-gray-400">by VBS</span>
                <span className="ml-2 px-2 py-0.5 bg-primary text-white text-xs rounded-md">Admin</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setActiveTab("creditRequests")}>
              <Bell className="h-5 w-5" />
              {creditRequests.filter(req => req.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {creditRequests.filter(req => req.status === "pending").length}
                </span>
              )}
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 focus:outline-none">
                <span className="hidden md:block font-medium">Admin</span>
                <div className="h-9 w-9 rounded-full bg-gray-800 flex items-center justify-center">
                  <UserIcon className="h-5 w-5" />
                </div>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowPasswordDialog(true)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <div className="hidden md:block w-64 bg-gray-900 text-white">
          <div className="p-4">
            <div className="flex items-center px-3 py-2 text-gray-400 text-sm">
              <span>MAIN NAVIGATION</span>
            </div>

            <ul className="mt-2">
              <li>
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${activeTab === "dashboard" ? "text-white bg-primary hover:bg-primary/90" : "text-gray-400 hover:text-white hover:bg-gray-800"} font-medium`}
                  onClick={() => setActiveTab("dashboard")}
                >
                  <Home className="mr-2 h-5 w-5" />
                  Dashboard
                </Button>
              </li>
              <li className="mt-1">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${activeTab === "users" ? "text-white bg-primary hover:bg-primary/90" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                  onClick={() => setActiveTab("users")}
                >
                  <Users className="mr-2 h-5 w-5" />
                  User Management
                </Button>
              </li>
              <li className="mt-1">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${activeTab === "messages" ? "text-white bg-primary hover:bg-primary/90" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                  onClick={() => setActiveTab("messages")}
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Message Logs
                </Button>
              </li>
              <li className="mt-1">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${activeTab === "creditRequests" ? "text-white bg-primary hover:bg-primary/90" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                  onClick={() => setActiveTab("creditRequests")}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Credit Requests
                    </div>
                    {creditRequests.filter(req => req.status === "pending").length > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-medium">
                        {creditRequests.filter(req => req.status === "pending").length}
                      </span>
                    )}
                  </div>
                </Button>
              </li>
              <li className="mt-1">
                <Button 
                  variant="ghost" 
                  className={`w-full justify-start ${activeTab === "protectedNumbers" ? "text-white bg-primary hover:bg-primary/90" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                  onClick={() => setActiveTab("protectedNumbers")}
                >
                  <Shield className="mr-2 h-5 w-5" />
                  Protected Numbers
                </Button>
              </li>
              <li className="mt-1">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800" 
                >
                  <Settings className="mr-2 h-5 w-5" />
                  Settings
                </Button>
              </li>
            </ul>

            <div className="mt-6">
              <div className="flex items-center px-3 py-2 text-gray-400 text-sm">
                <span>TOOLS</span>
              </div>

              <ul className="mt-2">
                <li>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800" 
                  >
                    <Flame className="mr-2 h-5 w-5" />
                    Message Bomber
                  </Button>
                </li>
                <li className="mt-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800" 
                  >
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Analytics
                  </Button>
                </li>
                <li className="mt-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800" 
                  >
                    <Info className="mr-2 h-5 w-5" />
                    System Logs
                  </Button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gray-100 overflow-auto">
          <div className="p-6 pb-20 md:pb-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === "dashboard" && "Admin Dashboard"}
                {activeTab === "messages" && "Message Logs"}
                {activeTab === "creditRequests" && "Credit Requests"}
                {activeTab === "protectedNumbers" && "Protected Numbers"}
              </h1>
              <p className="text-gray-600">
                {activeTab === "dashboard" && "Manage your system and users"}
                {activeTab === "messages" && "View all message activity"}
                {activeTab === "creditRequests" && "Manage user credit requests"}
                {activeTab === "protectedNumbers" && "Manage numbers protected from bomber messages"}
              </p>
            </div>

            {/* Main Content based on active tab */}
            {activeTab === "dashboard" && (
              <>
                {/* Stats Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-l-4 border-primary">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-600 text-sm">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {isLoadingStats ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              ) : (
                                stats?.totalUsers || 0
                              )}
                            </p>
                          </div>
                          <div className="p-2 rounded-full bg-blue-100 text-primary">
                            <Users className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="text-green-500 text-sm flex items-center">
                            <ChevronUp className="h-4 w-4 mr-1" />
                            {Math.floor(Math.random() * 10) + 1}%
                          </span>
                          <span className="text-gray-600 text-xs ml-1">vs last month</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Card className="border-l-4 border-green-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-600 text-sm">Total Messages</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {isLoadingStats ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              ) : (
                                stats?.totalMessages || 0
                              )}
                            </p>
                          </div>
                          <div className="p-2 rounded-full bg-green-100 text-green-600">
                            <MessageCircle className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="text-green-500 text-sm flex items-center">
                            <ChevronUp className="h-4 w-4 mr-1" />
                            {Math.floor(Math.random() * 15) + 10}%
                          </span>
                          <span className="text-gray-600 text-xs ml-1">vs last month</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Card className="border-l-4 border-purple-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-600 text-sm">Active Users</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {isLoadingStats ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              ) : (
                                stats?.activeUsers || 0
                              )}
                            </p>
                          </div>
                          <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                            <UserIcon className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="text-green-500 text-sm flex items-center">
                            <ChevronUp className="h-4 w-4 mr-1" />
                            {Math.floor(Math.random() * 8) + 3}%
                          </span>
                          <span className="text-gray-600 text-xs ml-1">vs last month</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Card className="border-l-4 border-red-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-600 text-sm">Failed Messages</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {isLoadingStats ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              ) : (
                                stats?.failedMessages || 0
                              )}
                            </p>
                          </div>
                          <div className="p-2 rounded-full bg-red-100 text-red-600">
                            <XCircle className="h-6 w-6" />
                          </div>
                        </div>
                        <div className="flex items-center mt-2">
                          <span className="text-green-500 text-sm flex items-center">
                            <ChevronDown className="h-4 w-4 mr-1" />
                            {Math.floor(Math.random() * 5) + 1}%
                          </span>
                          <span className="text-gray-600 text-xs ml-1">less errors</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Admin Tools */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Custom Message Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Card>
                      <CardHeader className="border-b border-gray-200">
                        <CardTitle className="flex items-center">
                          <MessageCircle className="h-5 w-5 mr-2 text-blue500" />
                          Custom Message
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="p-6">
                        <Form {...customMessageForm}>
                          <form onSubmit={customMessageForm.handleSubmit(onCustomMessageSubmit)} className="space-y-4">
                            <FormField
                              control={customMessageForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Enter phone number" 
                                      {...field} 
                                      disabled={customMessageMutation.isPending}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={customMessageForm.control}
                              name="message"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Message</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Enter your message (max 50 characters)"
                                      {...field}
                                      disabled={customMessageMutation.isPending}
                                      className="resize-none"
                                      maxLength={50}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    {field.value.length}/50 characters
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button 
                              type="submit" 
                              className="w-full" 
                              disabled={customMessageMutation.isPending}
                            >
                              {customMessageMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : "Send Message"}
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Message Bomber Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <Card>
                      <CardHeader className="border-b border-gray-200">
                        <CardTitle className="flex items-center">
                          <Flame className="h-5 w-5 mr-2 text-purple-500" />
                          Message Bomber
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="p-6">
                        <Form {...bomberForm}>
                          <form onSubmit={bomberForm.handleSubmit(onBomberSubmit)} className="space-y-4">
                            <FormField
                              control={bomberForm.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Enter phone number" 
                                      {...field} 
                                      disabled={bomberMutation.isPending}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={bomberForm.control}
                              name="repeat"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Repeat Count</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min={1} 
                                      max={20} 
                                      {...field}
                                      value={field.value}
                                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                                      disabled={bomberMutation.isPending}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button 
                              type="submit" 
                              className="w-full flex items-center justify-center" 
                              disabled={bomberMutation.isPending}
                            >
                              {bomberMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending {bomberProgress.current}/{bomberProgress.total} messages...
                                </>
                              ) : (
                                <>
                                  <Flame className="mr-2 h-4 w-4" />
                                  Send Multiple Messages
                                </>
                              )}
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* User Management Quick Access */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <Card>
                      <CardHeader className="border-b border-gray-200">
                        <CardTitle className="flex items-center">
                          <Users className="h-5 w-5 mr-2 text-primary" />
                          User Management
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="p-6">
                        <Form {...userActionForm}>
                          <form onSubmit={userActionForm.handleSubmit(onUserActionSubmit)} className="space-y-4">
                            <FormField
                              control={userActionForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username/Phone</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="Enter username or phone" 
                                      {...field} 
                                      disabled={addCreditsMutation.isPending || removeCreditsMutation.isPending}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div>
                              <FormLabel>Quick Action</FormLabel>
                              <Select 
                                onValueChange={setSelectedAction}
                                value={selectedAction}
                                disabled={addCreditsMutation.isPending || removeCreditsMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an action" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="add_credits">Add Credits</SelectItem>
                                  <SelectItem value="remove_credits">Remove Credits</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {selectedAction && (
                              <FormField
                                control={userActionForm.control}
                                name="credits"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Credits</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min={1} 
                                        disabled={addCreditsMutation.isPending || removeCreditsMutation.isPending}
                                        {...field}
                                        value={field.value}
                                        onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            <Button 
                              type="submit" 
                              className="w-full" 
                              disabled={!selectedAction || addCreditsMutation.isPending || removeCreditsMutation.isPending}
                            >
                              {(addCreditsMutation.isPending || removeCreditsMutation.isPending) ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                selectedAction === "add_credits" ? "Add Credits" : 
                                selectedAction === "remove_credits" ? "Remove Credits" : 
                                "Apply Action"
                              )}
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* User Table */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <Card className="mb-6">
                    <CardHeader className="border-b border-gray-200">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 mr-2 text-primary" />
                          User List
                        </div>
                        <Button variant="outline" size="sm" className="flex items-center">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add User
                        </Button>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                      {isLoadingUsers ? (
                        <div className="flex justify-center items-center h-40">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Phone Number</TableHead>
                                <TableHead>Credits</TableHead>
                                <TableHead>Messages Sent</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Registration Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <AnimatePresence>
                                {users.map((user: any, index: number) => (
                                  <motion.tr 
                                    key={user.id} 
                                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                  >
                                    <TableCell className="font-medium">
                                      <div className="flex items-center">
                                        <Avatar className="h-8 w-8 mr-2">
                                          <AvatarFallback className="bg-primary text-white">
                                            {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                                          </AvatarFallback>
                                        </Avatar>
                                        {user.username}
                                        {user.isAdmin && (
                                          <Badge className="ml-2 bg-primary" variant="default">Admin</Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>{formatPhoneNumber(user.phone)}</TableCell>
                                    <TableCell>{user.messagesRemaining}</TableCell>
                                    <TableCell>{user.messagesSent}</TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={user.isActive ? "default" : "destructive"}
                                        className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                      >
                                        {user.isActive ? "Active" : "Disabled"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-600 text-sm">
                                      {formatDate(user.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="text-primary mr-3"
                                        onClick={() => {
                                          setActiveTab("users");
                                          userActionForm.reset({
                                            username: user.username,
                                            credits: 0
                                          });
                                          setSelectedAction("add_credits");
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className={user.isActive ? "text-red-600" : "text-green-600"}
                                        onClick={() => handleToggleUser(user.username, user.isActive)}
                                        disabled={toggleUserMutation.isPending}
                                      >
                                        {user.isActive ? "Disable" : "Enable"}
                                      </Button>
                                    </TableCell>
                                  </motion.tr>
                                ))}
                              </AnimatePresence>
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}

            {/* Message Logs Tab */}
            {activeTab === "messages" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6">
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageCircle className="h-5 w-5 mr-2 text-primary" />
                        Message Activity
                      </div>
                      <div className="flex items-center space-x-2">
                        <Select>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Messages</SelectItem>
                            <SelectItem value="single">Single Messages</SelectItem>
                            <SelectItem value="bomber">Bomber Messages</SelectItem>
                            <SelectItem value="credit_request">Credit Requests</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    {isLoadingMessages ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>User</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Message</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {messages.map((message: any, index: number) => (
                                <motion.tr 
                                  key={message.id} 
                                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                  <TableCell>
                                    <Badge 
                                      variant="outline"
                                      className={
                                        message.type === "single" ? "bg-blue-100 text-blue-800 border-blue-300" : 
                                        message.type === "bomber" ? "bg-purple-100 text-purple-800 border-purple-300" :
                                        message.type === "credit_request" ? "bg-amber-100 text-amber-800 border-amber-300" :
                                        "bg-gray-100 text-gray-800 border-gray-300"
                                      }
                                    >
                                      {message.type === "single" ? "Single" : 
                                      message.type === "bomber" ? "Bomber" :
                                      message.type === "credit_request" ? "Credit Request" :
                                      message.type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{message.userName || message.user || "System"}</TableCell>
                                  <TableCell>{message.phone}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{message.message}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={message.status === "sent" ? "default" : message.status === "pending" ? "outline" : "destructive"}
                                      className={
                                        message.status === "sent" ? "bg-green-100 text-green-800" : 
                                        message.status === "pending" ? "bg-blue-100 text-blue-800" :
                                        "bg-red-100 text-red-800"
                                      }
                                    >
                                      {message.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-600 text-sm">
                                    {formatDate(message.createdAt)}
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Credit Requests Tab */}
            {activeTab === "creditRequests" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6">
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2 text-primary" />
                        Credit Requests
                      </div>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    {isLoadingCreditRequests ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : creditRequests.length === 0 ? (
                      <div className="flex flex-col justify-center items-center h-40 text-gray-500">
                        <CreditCard className="h-12 w-12 mb-3 opacity-30" />
                        <p>No credit requests found</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {creditRequests.map((request: any) => {
                          const { credits, username, reason } = extractCreditInfo(request.message);
                          return (
                            <div key={request.id} className="p-4 hover:bg-gray-50">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-medium flex items-center">
                                    {username}
                                    <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                                      {credits} Credits
                                    </Badge>
                                  </h3>
                                  <p className="text-gray-600 text-sm">{formatDate(request.createdAt)}</p>
                                </div>

                                <div className="flex space-x-2">
                                  {request.status === "pending" ? (
                                    <>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleRejectCreditRequest(request.id)}
                                        disabled={rejectCreditRequestMutation.isPending}
                                      >
                                        {rejectCreditRequestMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : "Reject"}
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() => handleApproveCreditRequest(request.id, request.userId, credits)}
                                        disabled={approveCreditRequestMutation.isPending}
                                      >
                                        {approveCreditRequestMutation.isPending ? (
                                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                        ) : <CheckCircle className="h-4 w-4 mr-1" />}
                                        Approve
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge 
                                      variant={request.status === "approved" ? "default" : "destructive"}
                                      className={
                                        request.status === "approved" 
                                          ? "bg-green-100 text-green-800" 
                                          : "bg-red-100 text-red-800"
                                      }
                                    >
                                      {request.status === "approved" ? "Approved" : "Rejected"}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="bg-gray-100 p-3 rounded-lg">
                                <p className="text-gray-700"><span className="font-medium">Reason:</span> {reason}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* User Management Tab */}
            {activeTab === "users" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6">
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-primary" />
                        User List
                      </div>
                      <Button variant="outline" size="sm" className="flex items-center">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                      </Button>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-0">
                    {isLoadingUsers ? (
                      <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Phone Number</TableHead>
                              <TableHead>Credits</TableHead>
                              <TableHead>Messages Sent</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Registration Date</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {users.map((user: any, index: number) => (
                                <motion.tr 
                                  key={user.id} 
                                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                  <TableCell className="font-medium">
                                    <div className="flex items-center">
                                      <Avatar className="h-8 w-8 mr-2">
                                        <AvatarFallback className="bg-primary text-white">
                                          {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                                        </AvatarFallback>
                                      </Avatar>
                                      {user.username}
                                      {user.isAdmin && (
                                        <Badge className="ml-2 bg-primary" variant="default">Admin</Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>{formatPhoneNumber(user.phone)}</TableCell>
                                  <TableCell>{user.messagesRemaining}</TableCell>
                                  <TableCell>{user.messagesSent}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={user.isActive ? "default" : "destructive"}
                                      className={user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                                    >
                                      {user.isActive ? "Active" : "Disabled"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-600 text-sm">
                                    {formatDate(user.createdAt)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button 
                                      variant="link" 
                                      size="sm" 
                                      className="text-primary mr-3"
                                      onClick={() => {
                                        setActiveTab("users");
                                        userActionForm.reset({
                                          username: user.username,
                                          credits: 0
                                        });
                                        setSelectedAction("add_credits");
                                      }}
                                    >
                                      Edit
                                    </Button>
                                    <Button 
                                      variant="link" 
                                      size="sm" 
                                      className={user.isActive ? "text-red-600" : "text-green-600"}
                                      onClick={() => handleToggleUser(user.username, user.isActive)}
                                      disabled={toggleUserMutation.isPending}
                                    >
                                      {user.isActive ? "Disable" : "Enable"}
                                    </Button>
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === "protectedNumbers" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Protect Number Form */}
                  <Card>
                    <CardHeader className="border-b border-gray-200">
                      <CardTitle className="flex items-center">
                        <ShieldPlus className="h-5 w-5 mr-2 text-primary" />
                        Protect New Number
                      </CardTitle>
                      <CardDescription>
                        Protected numbers won't receive bomber messages.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6">
                      <Form {...protectNumberForm}>
                        <form onSubmit={protectNumberForm.handleSubmit(handleProtectNumber)} className="space-y-4">
                          <FormField
                            control={protectNumberForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter phone number to protect" 
                                    {...field}
                                    disabled={protectNumberMutation.isPending}
                                  />
                                </FormControl>
                                <FormDescription>
                                  This number will be protected from bomber messages.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={protectNumberMutation.isPending}
                          >
                            {protectNumberMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Protecting...
                              </>
                            ) : (
                              <>
                                <ShieldPlus className="mr-2 h-4 w-4" />
                                Protect Number
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  {/* Protected Numbers List */}
                  <Card className="h-full">
                    <CardHeader className="border-b border-gray-200">
                      <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-primary" />
                        Protected Numbers List
                      </CardTitle>
                      <CardDescription>
                        These numbers are protected from bomber messages.
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6">
                      {isLoadingProtectedNumbers ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : protectedNumbers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <ShieldOff className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                          <p>No protected numbers found.</p>
                          <p className="text-sm">Use the form to protect phone numbers from bomber messages.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-gray-500">Total protected numbers: {protectedNumbers.length}</p>
                          </div>

                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {protectedNumbers.map((number, index) => (
                              <div 
                                key={index}
                                className="flex items-center justify-between rounded-lg border p-3 text-sm"
                              >
                                <div className="flex items-center space-x-3">
                                  <Shield className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="font-medium">{number.phone}</p>
                                    <p className="text-xs text-gray-500">
                                      {number.createdAt ? formatDate(number.createdAt) : 'Date unknown'}
                                      {number.userAdded && <span> • Added by {number.username || 'User'}</span>}
                                    </p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                  onClick={() => handleUnprotectNumber(number.phone)}
                                  disabled={unprotectNumberMutation.isPending}
                                >
                                  {unprotectNumberMutation.isPending ? 
                                    <Loader2 className="h-4 w-4 animate-spin" /> : 
                                    <Trash2 className="h-4 w-4" />
                                  }
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Admin Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password to update your credentials.
            </DialogDescription>
          </DialogHeader>

          <Form {...changePasswordForm}>
            <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4">
              <FormField
                control={changePasswordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter current password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={changePasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter new password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={changePasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm new password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPasswordDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Update Password
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white">
        <div className="flex items-center justify-around p-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setActiveTab("dashboard")}
            className={activeTab === "dashboard" ? "text-primary" : "text-gray-400"}
          >
            <Home className="h-6 w-6" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setActiveTab("messages")}
            className={activeTab === "messages" ? "text-primary" : "text-gray-400"}
          >
            <MessageCircle className="h-6 w-6" />
          </Button>

          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveTab("creditRequests")}
              className={activeTab === "creditRequests" ? "text-primary" : "text-gray-400"}
            >
              <CreditCard className="h-6 w-6" />
              {creditRequests.filter(req => req.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {creditRequests.filter(req => req.status === "pending").length}
                </span>
              )}
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setActiveTab("protectedNumbers")}
            className={activeTab === "protectedNumbers" ? "text-primary" : "text-gray-400"}
          >
            <Shield className="h-6 w-6" />
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            className="text-gray-400"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}