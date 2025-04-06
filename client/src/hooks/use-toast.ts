import { Toast, ToasterToast } from "@/components/ui/toast";
import { useToast as useToastPrimitive } from "@/components/ui/use-toast";

export const useToast = () => {
  const { toast, dismiss, ...rest } = useToastPrimitive();

  const showToast = (props: Toast) => {
    return toast({
      ...props,
      className: `${props.variant === "destructive" ? "destructive" : ""} ${props.className || ""}`,
    });
  };

  return {
    toast: showToast,
    dismiss,
    ...rest,
  };
};

export type { ToasterToast };
