import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const Pending = () => {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center bento-card">
        <h1 className="text-2xl font-medium mb-3">your request is being reviewed</h1>
        <p className="text-muted-foreground text-sm mb-6">
          you'll get an email when you're in. usually within a few days.
        </p>
        <Button variant="ghost" onClick={signOut}>sign out</Button>
      </div>
    </div>
  );
};

export default Pending;
