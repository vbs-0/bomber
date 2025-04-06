import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  useMutation, 
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
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
import { Loader2, ChevronDown, Send, MessageCircle, Check, CheckCircle, XCircle, LogOut, Settings, User as UserIcon, Zap, ShieldCheck, ShieldOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

// Utils
import { formatPhoneNumber, truncateText, getTimeAgo } from "@/lib/utils";

// Form schemas
const sendMessageSchema = z.object({
  phone: z.string().min(10, "Phone number must have at least 10 digits").max(15),
  message: z.string().min(1, "Message is required").max(50, "Message cannot exceed 50 characters"),
});

const bomberSchema = z.object({
  phone: z.string().min(10, "Phone number must have at least 10 digits").max(15),
  repeat: z.number().min(1, "Must send at least 1 message").max(10, "Cannot exceed 10 messages"),
});

const creditRequestSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters").max(200, "Reason cannot exceed 200 characters"),
  credits: z.number().min(1, "Must request at least 1 credit").max(100, "Cannot request more than 100 credits"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SendMessageFormValues = z.infer<typeof sendMessageSchema>;
type BomberFormValues = z.infer<typeof bomberSchema>;
type CreditRequestFormValues = z.infer<typeof creditRequestSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function UserDashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCreditRequestDialog, setShowCreditRequestDialog] = useState(false);
  const [bomberProgress, setBomberProgress] = useState({ current: 0, total: 0 });

  // Check authentication
  useEffect(() => {
    if (!user) {
      setLocation('/auth');
    }
  }, [user, setLocation]);

  // Get user messages
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages 
  } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });
  
  // Get number protection status
  const {
    data: protectionStatus,
    isLoading: isLoadingProtectionStatus
  } = useQuery({
    queryKey: ["/api/my-number-protection-status"],
    enabled: !!user,
  });
  
  // Protect number mutation
  const protectNumberMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/protect-my-number", {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Number protected",
        description: "Your phone number is now protected from bomber messages",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-number-protection-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to protect number",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Unprotect number mutation
  const unprotectNumberMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/unprotect-my-number", {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Protection removed",
        description: "Your phone number is no longer protected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/my-number-protection-status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove protection",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send message form
  const sendMessageForm = useForm<SendMessageFormValues>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      phone: "",
      message: "",
    },
  });
  
  // Bomber form
  const bomberForm = useForm<BomberFormValues>({
    resolver: zodResolver(bomberSchema),
    defaultValues: {
      phone: "",
      repeat: 2,
    },
  });
  
  // Update the bomber form's max value when user data changes
  useEffect(() => {
    if (user) {
      const currentValue = bomberForm.getValues().repeat;
      // If current value is higher than available messages, reset to max available (or 2 if only 1 left)
      if (currentValue > user.messagesRemaining) {
        bomberForm.setValue('repeat', Math.max(2, Math.min(user.messagesRemaining, 20)));
      }
    }
  }, [user, bomberForm]);
  
  // Credit request form
  const creditRequestForm = useForm<CreditRequestFormValues>({
    resolver: zodResolver(creditRequestSchema),
    defaultValues: {
      reason: "",
      credits: 10,
    },
  });

  // Change password form
  const changePasswordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: SendMessageFormValues) => {
      const res = await apiRequest("POST", "/api/send-message", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
      sendMessageForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bomber mutation
  const bomberMutation = useMutation({
    mutationFn: async (data: BomberFormValues) => {
      setBomberProgress({ current: 0, total: data.repeat });
      const res = await apiRequest("POST", "/api/bomber", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Messages sent",
        description: `Successfully sent ${bomberProgress.total} messages`,
      });
      bomberForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send messages",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Credit request mutation
  const creditRequestMutation = useMutation({
    mutationFn: async (data: CreditRequestFormValues) => {
      const res = await apiRequest("POST", "/api/request-credits", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your credit request has been submitted to administrators",
      });
      creditRequestForm.reset();
      setShowCreditRequestDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
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

  // Handlers
  const onSendMessage = (data: SendMessageFormValues) => {
    sendMessageMutation.mutate(data);
  };
  
  const onSendBomber = (data: BomberFormValues) => {
    bomberMutation.mutate(data);
  };
  
  const onRequestCredits = (data: CreditRequestFormValues) => {
    creditRequestMutation.mutate(data);
  };

  const onChangePassword = (data: ChangePasswordFormValues) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const handleProtectNumber = () => {
    protectNumberMutation.mutate();
  };
  
  const handleUnprotectNumber = () => {
    unprotectNumberMutation.mutate();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 py-3 px-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mr-3">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900">Message Tool</h1>
              <span className="text-xs text-gray-600">by VBS</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="hidden md:block">
            <span className="text-gray-600 text-sm">Messages Remaining: </span>
            <span className="font-semibold text-primary">{user.messagesRemaining}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 focus:outline-none">
                <span className="hidden md:block text-gray-800 font-medium">{user.username}</span>
                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-800">
                  <UserIcon className="h-5 w-5" />
                </div>
                <ChevronDown className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
      <div className="flex-1 bg-gray-100 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardContent className="p-5 flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 text-primary mr-4">
                    <MessageCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Messages Remaining</p>
                    <p className="text-2xl font-bold text-gray-900">{user.messagesRemaining}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-5 flex items-center">
                  <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                    <Check className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Messages Sent</p>
                    <p className="text-2xl font-bold text-gray-900">{user.messagesSent}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-5 flex items-center">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Account Status</p>
                    <p className="text-sm font-medium text-gray-900">
                      {user.isActive ? (
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <XCircle className="h-4 w-4 mr-1" /> Suspended
                        </span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          
          {/* Phone Protection Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="mb-6"
          >
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle>Phone Number Protection</CardTitle>
                <CardDescription>Protect your phone number from bomber messages</CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                {isLoadingProtectionStatus ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`p-2 rounded-full ${protectionStatus?.isProtected ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                          {protectionStatus?.isProtected ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-medium">
                            {protectionStatus?.isProtected ? 'Your number is protected' : 'Your number is not protected'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatPhoneNumber(protectionStatus?.phone || user.phone)}
                          </p>
                        </div>
                      </div>
                      
                      {protectionStatus?.isProtected ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleUnprotectNumber}
                          disabled={unprotectNumberMutation.isPending}
                          className="flex items-center"
                        >
                          {unprotectNumberMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldOff className="mr-2 h-4 w-4" />
                          )}
                          Remove Protection
                        </Button>
                      ) : (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleProtectNumber}
                          disabled={protectNumberMutation.isPending}
                          className="flex items-center"
                        >
                          {protectNumberMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="mr-2 h-4 w-4" />
                          )}
                          Protect My Number
                        </Button>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-md text-sm">
                      <p className="text-gray-600">
                        When your number is protected, no one (including administrators) can use the message bomber feature to send multiple messages to your number.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Message Sending Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="border-b border-gray-200">
                  <CardTitle>Send Custom Message</CardTitle>
                  <CardDescription>Enter phone number and compose your message (max 50 characters)</CardDescription>
                </CardHeader>
              
              <CardContent className="p-6">
                <Form {...sendMessageForm}>
                  <form onSubmit={sendMessageForm.handleSubmit(onSendMessage)} className="space-y-4">
                    <FormField
                      control={sendMessageForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter phone number" 
                              {...field} 
                              disabled={sendMessageMutation.isPending || user.messagesRemaining <= 0}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={sendMessageForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Content</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Textarea 
                                placeholder="Type your message here..." 
                                rows={3} 
                                maxLength={50} 
                                {...field} 
                                disabled={sendMessageMutation.isPending || user.messagesRemaining <= 0}
                              />
                              <div className="absolute bottom-2 right-2 text-xs text-gray-600">
                                <span className={field.value.length > 45 ? "text-red-500" : ""}>
                                  {field.value.length}
                                </span>/50
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={sendMessageMutation.isPending || user.messagesRemaining <= 0}
                        className="flex items-center"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Send Message
                      </Button>
                    </div>
                    
                    {user.messagesRemaining <= 0 && (
                      <div className="text-center text-red-600 text-sm mt-2">
                        You have no messages remaining. Please contact an administrator.
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle>Message Bomber</CardTitle>
                <CardDescription>Send multiple messages to a single number</CardDescription>
              </CardHeader>
              
              <CardContent className="p-6">
                <Form {...bomberForm}>
                  <form onSubmit={bomberForm.handleSubmit(onSendBomber)} className="space-y-4">
                    <FormField
                      control={bomberForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter phone number" 
                              {...field} 
                              disabled={bomberMutation.isPending || user.messagesRemaining <= 0}
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
                          <FormLabel>Number of Messages</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Slider
                                value={[field.value]}
                                min={2}
                                max={Math.min(user.messagesRemaining, 20)} // Max is either user's remaining messages or 20, whichever is less
                                step={1}
                                onValueChange={(value) => field.onChange(value[0])}
                                disabled={bomberMutation.isPending || user.messagesRemaining <= 0}
                              />
                              <span className="w-12 text-center font-medium">{field.value}</span>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Will use {field.value} messages from your quota
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {bomberMutation.isPending && (
                      <div className="my-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Sending messages...</span>
                          <span className="text-sm">{bomberProgress.current}/{bomberProgress.total}</span>
                        </div>
                        <Progress value={(bomberProgress.current / bomberProgress.total) * 100} />
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        variant="destructive"
                        disabled={bomberMutation.isPending || user.messagesRemaining <= 0}
                        className="flex items-center"
                      >
                        {bomberMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="mr-2 h-4 w-4" />
                        )}
                        Send Bomber
                      </Button>
                    </div>
                    
                    {user.messagesRemaining <= 0 && (
                      <div className="text-center text-red-600 text-sm mt-2">
                        You have no messages remaining. Please contact an administrator.
                      </div>
                    )}
                    {user.messagesRemaining < bomberForm.getValues().repeat && user.messagesRemaining > 0 && (
                      <div className="text-center text-yellow-600 text-sm mt-2">
                        You don't have enough messages for this. Please reduce the number.
                      </div>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
          
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card>
              <CardHeader className="border-b border-gray-200 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent message sending history</CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageCircle className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium">No messages yet</h3>
                    <p className="mt-1">You haven't sent any messages yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    <AnimatePresence>
                      {messages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="p-4 hover:bg-gray-50 transition-all"
                        >
                          <div className="flex items-start">
                            <div className="p-2 rounded-full bg-blue-100 text-primary mr-3">
                              <MessageCircle className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    Message sent to {formatPhoneNumber(message.phone)}
                                  </p>
                                  <p className="text-gray-600 text-sm mt-1 truncate">
                                    {truncateText(message.message, 40)}
                                  </p>
                                </div>
                                <span className="text-gray-600 text-xs">
                                  {getTimeAgo(message.createdAt)}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center">
                                <Badge variant={message.status === "sent" ? "default" : "destructive"}>
                                  {message.status === "sent" ? "Delivered" : "Failed"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      
      {/* Request Credits Button */}
      <div className="fixed bottom-4 right-4">
        <Button 
          onClick={() => setShowCreditRequestDialog(true)}
          size="lg"
          className="shadow-lg"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Request Credits
        </Button>
      </div>

      {/* Credit Request Dialog */}
      <Dialog open={showCreditRequestDialog} onOpenChange={setShowCreditRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Additional Credits</DialogTitle>
            <DialogDescription>
              Submit your request for additional message credits. Our administrators will review your request.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...creditRequestForm}>
            <form onSubmit={creditRequestForm.handleSubmit(onRequestCredits)} className="space-y-4">
              <FormField
                control={creditRequestForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Request</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Explain why you need additional credits..." 
                        rows={4} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={creditRequestForm.control}
                name="credits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credits Requested</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[field.value]}
                          min={1}
                          max={100}
                          step={1}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                        <span className="w-12 text-center font-medium">{field.value}</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreditRequestDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={creditRequestMutation.isPending}
                >
                  {creditRequestMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
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
    </div>
  );
}
