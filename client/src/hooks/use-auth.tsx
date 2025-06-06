import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { 
  User, 
  insertUserSchema 
} from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type UserResponse = Omit<User, "password">;
type RegistrationResponse = { message: string; phone: string; username: string };

type LoginCredentials = {
  username: string;
  password: string;
};

type RegistrationCredentials = z.infer<typeof insertUserSchema>;

type VerifyOtpCredentials = {
  phone: string;
  code: string;
};

type AuthContextType = {
  user: UserResponse | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserResponse, Error, LoginCredentials>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<RegistrationResponse, Error, RegistrationCredentials>;
  verifyOtpMutation: UseMutationResult<{ message: string }, Error, VerifyOtpCredentials>;
  completeRegistrationMutation: UseMutationResult<UserResponse, Error, RegistrationCredentials>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<UserResponse | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: UserResponse) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.fullName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegistrationCredentials) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (data: RegistrationResponse) => {
      toast({
        title: "Registration initiated",
        description: "A verification code has been sent to your phone",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: VerifyOtpCredentials) => {
      const res = await apiRequest("POST", "/api/verify-otp", data);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verification successful",
        description: "Your phone number has been verified",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeRegistrationMutation = useMutation({
    mutationFn: async (credentials: RegistrationCredentials) => {
      const res = await apiRequest("POST", "/api/complete-registration", credentials);
      return await res.json();
    },
    onSuccess: (user: UserResponse) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration complete",
        description: "Your account has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        verifyOtpMutation,
        completeRegistrationMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
