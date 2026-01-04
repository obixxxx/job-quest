import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const { login, register } = useAuth();
  const { toast } = useToast();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onSubmit",
  });

  const handleSubmit = async (data: AuthFormValues) => {
    if (!isLogin && data.password !== data.confirmPassword) {
      form.setError("confirmPassword", { message: "Passwords don't match" });
      return;
    }

    setIsPending(true);
    try {
      if (isLogin) {
        await login(data.email, data.password);
        toast({ title: "Welcome back!", description: "Ready to continue your quest?" });
      } else {
        await register(data.email, data.password);
        toast({ title: "Account created!", description: "Your quest begins now!" });
      }
    } catch (error) {
      toast({
        title: isLogin ? "Login failed" : "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const toggleMode = () => {
    form.reset();
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-md bg-primary flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-xl">JQ</span>
            </div>
            <CardTitle className="text-2xl font-serif">
              {isLogin ? "Welcome Back" : "Start Your Quest"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Sign in to continue your job search journey"
                : "Create an account to gamify your job search"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          {...field}
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={isLogin ? "Enter your password" : "Create a password"}
                          autoComplete={isLogin ? "current-password" : "new-password"}
                          {...field}
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isLogin && (
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            {...field}
                            data-testid="input-confirm-password"
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
                  disabled={isPending} 
                  data-testid={isLogin ? "button-login" : "button-register"}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isLogin ? "Signing in..." : "Creating account..."}
                    </>
                  ) : (
                    isLogin ? "Sign In" : "Create Account"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={toggleMode}
                data-testid="button-toggle-auth-mode"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <Sparkles className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-serif font-semibold mb-4">
            Turn Job Search Into an Adventure
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Earn XP for every outreach. Build streaks. Level up your career.
            Job Quest makes networking feel like a game you actually want to play.
          </p>
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <p className="font-mono text-3xl font-bold text-game-xp">XP</p>
              <p className="text-sm text-muted-foreground">Momentum Points</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-3xl font-bold text-game-os">OS</p>
              <p className="text-sm text-muted-foreground">Opportunity Score</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
