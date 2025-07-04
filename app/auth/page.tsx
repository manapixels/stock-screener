import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md space-y-8">
          <h1 className="text-center text-2xl sm:text-3xl font-bold flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-line-chart text-blue-600"
            >
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
            Welcome to Signal
          </h1>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border">
                <h2 className="text-center text-xl sm:text-2xl font-bold mb-6">
                  Sign In
                </h2>
                <LoginForm />
              </div>
            </TabsContent>
            <TabsContent value="register">
              <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border">
                <h2 className="text-center text-xl sm:text-2xl font-bold mb-6">
                  Create Account
                </h2>
                <RegisterForm />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
