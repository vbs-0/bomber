import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MessageCircle, Lock, EyeOff, Eye, ArrowLeft } from "lucide-react";

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";

// Form schemas
const loginSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  phone: z.string().min(10, "Phone number must have at least 10 digits").max(15),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<RegisterFormValues | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countdownTime, setCountdownTime] = useState(30);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  
  const { 
    user, 
    isLoading, 
    loginMutation, 
    registerMutation, 
    verifyOtpMutation,
    completeRegistrationMutation 
  } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    }
  }, [user, setLocation]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  // OTP form
  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  // OTP countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCountdownActive && countdownTime > 0) {
      interval = setInterval(() => {
        setCountdownTime(prevTime => prevTime - 1);
      }, 1000);
    } else if (countdownTime === 0) {
      setIsCountdownActive(false);
      setCountdownTime(30);
    }
    
    return () => clearInterval(interval);
  }, [isCountdownActive, countdownTime]);

  // Form submission handlers
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({
      username: data.username,
      password: data.password,
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    setPendingRegistration(data);
    registerMutation.mutate({
      fullName: data.fullName,
      username: data.username,
      phone: data.phone,
      password: data.password,
      isAdmin: false,
    }, {
      onSuccess: () => {
        setShowOtpVerification(true);
        setIsCountdownActive(true);
      }
    });
  };

  const onOtpSubmit = (data: OtpFormValues) => {
    if (!pendingRegistration) return;
    
    verifyOtpMutation.mutate({
      phone: pendingRegistration.phone,
      code: data.otp,
    }, {
      onSuccess: () => {
        completeRegistrationMutation.mutate({
          fullName: pendingRegistration.fullName,
          username: pendingRegistration.username,
          phone: pendingRegistration.phone,
          password: pendingRegistration.password,
          isAdmin: false,
        });
      }
    });
  };

  const handleResendOtp = () => {
    if (!pendingRegistration || isCountdownActive) return;
    
    registerMutation.mutate({
      fullName: pendingRegistration.fullName,
      username: pendingRegistration.username,
      phone: pendingRegistration.phone,
      password: pendingRegistration.password,
      isAdmin: false,
    }, {
      onSuccess: () => {
        setIsCountdownActive(true);
      }
    });
  };

  const handleBackToRegister = () => {
    setShowOtpVerification(false);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Login/Register form */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-4 md:p-8 bg-white">
        <motion.div 
          className="w-full max-w-md"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Logo and app name */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-white mb-4">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Message Tool</h1>
            <p className="text-gray-600">by VBS</p>
          </div>
          
          {/* Auth content */}
          <AnimatePresence mode="wait">
            {!showOtpVerification ? (
              <motion.div
                key="auth-forms"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Tabs 
                  defaultValue="login" 
                  value={activeTab} 
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Enter your password" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex items-center justify-between">
                          <FormField
                            control={loginForm.control}
                            name="rememberMe"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">Remember me</FormLabel>
                              </FormItem>
                            )}
                          />
                          <Button variant="link" className="p-0 h-auto text-sm">
                            Forgot password?
                          </Button>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Sign In
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                  
                  <TabsContent value="register">
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <FormField
                          control={registerForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Choose a username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input 
                                  type="tel" 
                                  placeholder="Enter your phone number" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showPassword ? "text" : "password"} 
                                    placeholder="Create a password" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showConfirmPassword ? "text" : "password"} 
                                    placeholder="Confirm your password" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Register
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>
              </motion.div>
            ) : (
              <motion.div
                key="otp-verification"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-primary mb-4">
                    <Lock className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Verify Your Phone</h2>
                  <p className="text-gray-600 mt-1">We've sent a verification code to your phone</p>
                  <p className="text-primary font-medium mt-1">{pendingRegistration?.phone}</p>
                </div>
                
                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem className="mx-auto">
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter 6-digit code"
                              maxLength={6}
                              className="text-center text-lg tracking-widest"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-center">
                      <div className="text-gray-600 text-center">
                        Didn't receive code? {" "}
                        <Button 
                          type="button" 
                          variant="link" 
                          className="p-0 h-auto font-medium"
                          onClick={handleResendOtp}
                          disabled={isCountdownActive || verifyOtpMutation.isPending}
                        >
                          Resend Code
                        </Button>
                        <div className="mt-2">
                          <span className="text-gray-600">
                            {isCountdownActive ? `Resend in ${countdownTime}s` : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={verifyOtpMutation.isPending || completeRegistrationMutation.isPending}
                    >
                      {(verifyOtpMutation.isPending || completeRegistrationMutation.isPending) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Verify & Continue
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={handleBackToRegister}
                      disabled={verifyOtpMutation.isPending || completeRegistrationMutation.isPending}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Register
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      
      {/* Right side - Image and info */}
      <div className="hidden md:block w-1/2 bg-[url('https://images.unsplash.com/photo-1556139943-4bdca53adf1e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center">
        <div className="h-full backdrop-blur-md bg-white/15 p-8 flex flex-col justify-center items-center text-white">
          <div className="max-w-md text-center">
            <h2 className="text-4xl font-bold mb-6">Next-Gen Messaging Platform</h2>
            <p className="text-xl opacity-90 mb-8">Send custom messages with ease and manage your messaging workflow efficiently.</p>
            
            <div className="grid grid-cols-2 gap-6 mb-12">
              <div className="bg-white/10 p-4 rounded-xl">
                <div className="rounded-full bg-white/20 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Custom Messages</h3>
                <p className="text-sm opacity-80">Send personalized messages to any number with complete customization.</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <div className="rounded-full bg-white/20 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Secure OTP</h3>
                <p className="text-sm opacity-80">Advanced OTP verification system for account security.</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <div className="rounded-full bg-white/20 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-1">Admin Controls</h3>
                <p className="text-sm opacity-80">Advanced admin dashboard for complete control over user access.</p>
              </div>
              <div className="bg-white/10 p-4 rounded-xl">
                <div className="rounded-full bg-white/20 w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-1">Advanced Features</h3>
                <p className="text-sm opacity-80">Mass messaging capabilities with customizable repetition.</p>
              </div>
            </div>
            
            <div className="text-sm opacity-70">
              <p>© {new Date().getFullYear()} Message Tool by VBS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
