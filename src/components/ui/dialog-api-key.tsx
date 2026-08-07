import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Key, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TwoFactorSetup from "@/components/auth/TwoFactorSetup";
import { useSettings } from "@/contexts/SettingsContext";

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyDialog({ open, onOpenChange }: ApiKeyDialogProps) {
  const { apiKeys, setApiKey, user } = useAuth();
  const { settings } = useSettings();
  const show2FA = true;
  const showApiKeys = settings?.showAiSettings !== false;
  const [inputValues, setInputValues] = useState({
    gemini: "",
    openai: "",
    anthropic: "",
    mistral: "",
    groq: "",
    nvidia: ""
  });
  const { toast } = useToast();

  // Load existing keys when dialog opens
  useEffect(() => {
    if (open) {
      setInputValues({
        gemini: apiKeys.gemini || "",
        openai: apiKeys.openai || "",
        anthropic: apiKeys.anthropic || "",
        mistral: apiKeys.mistral || "",
        groq: apiKeys.groq || "",
        nvidia: apiKeys.nvidia || ""
      });
    }
  }, [open, apiKeys]);

  const handleSave = () => {
    setApiKey("gemini", inputValues.gemini);
    setApiKey("openai", inputValues.openai);
    setApiKey("anthropic", inputValues.anthropic);
    setApiKey("mistral", inputValues.mistral);
    setApiKey("groq", inputValues.groq);
    setApiKey("nvidia", inputValues.nvidia);

    toast({
      title: "API Keys configuration saved",
      description: "Your API keys have been updated successfully.",
    });
    onOpenChange(false);
  };

  const handleChange = (model: string, value: string) => {
    setInputValues(prev => ({ ...prev, [model]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Manage your API keys and security settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={showApiKeys ? "keys" : "security"} className="w-full mt-4">
          <TabsList className={`grid w-full ${(showApiKeys && show2FA) ? 'grid-cols-2' : 'grid-cols-1'} bg-zinc-900 border border-zinc-800 rounded-xl p-1 mb-4`}>
            {showApiKeys && (
              <TabsTrigger value="keys" className="rounded-lg text-xs font-semibold py-2">
                <Key className="w-3.5 h-3.5 mr-2" /> API Keys
              </TabsTrigger>
            )}
            {show2FA && (
              <TabsTrigger value="security" className="rounded-lg text-xs font-semibold py-2">
                <Shield className="w-3.5 h-3.5 mr-2" /> Security (2FA)
              </TabsTrigger>
            )}
          </TabsList>

          {showApiKeys && (
            <TabsContent value="keys" className="space-y-6 outline-none">
            {/* Gemini Key */}
            <div className="space-y-2">
              <Label htmlFor="gemini-key">Gemini API Key</Label>
              <Input
                id="gemini-key"
                type="password"
                placeholder="Enter Gemini API key"
                value={inputValues.gemini}
                onChange={(e) => handleChange("gemini", e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Required for Gemini 2.5 Flash and other Google models.
              </p>
            </div>

            {/* OpenAI Key */}
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="Enter OpenAI API key"
                value={inputValues.openai}
                onChange={(e) => handleChange("openai", e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Required for GPT-4o and other OpenAI models.
              </p>
            </div>

            {/* Anthropic Key */}
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <Input
                id="anthropic-key"
                type="password"
                placeholder="Enter Anthropic API key"
                value={inputValues.anthropic}
                onChange={(e) => handleChange("anthropic", e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Required for Claude 3 Opus/Sonnet models.
              </p>
            </div>

            {/* Mistral Key */}
            <div className="space-y-2">
              <Label htmlFor="mistral-key">Mistral API Key</Label>
              <Input
                id="mistral-key"
                type="password"
                placeholder="Enter Mistral API key"
                value={inputValues.mistral}
                onChange={(e) => handleChange("mistral", e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Required for Mixtral 8x7B.
              </p>
            </div>

            {/* Groq Key */}
            <div className="space-y-2">
              <Label htmlFor="groq-key">Groq API Key</Label>
              <Input
                id="groq-key"
                type="password"
                placeholder="Enter Groq API key"
                value={inputValues.groq}
                onChange={(e) => handleChange("groq", e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Required for Llama 3 70B (via Groq).
              </p>
            </div>

            {/* NVIDIA Key */}
            <div className="space-y-2">
              <Label htmlFor="nvidia-key">NVIDIA API Key</Label>
              <Input
                id="nvidia-key"
                type="password"
                placeholder="Enter NVIDIA API key"
                value={inputValues.nvidia}
                onChange={(e) => handleChange("nvidia", e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Required for Llama 3.1 8B Instruct (via NVIDIA).
              </p>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Current Status:</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>Gemini:</span>
                  <span className={inputValues.gemini ? "text-green-600 font-medium" : "text-amber-600"}>
                    {inputValues.gemini ? "🟢 Custom Key Set" : "🟠 using default/demo"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>OpenAI:</span>
                  <span className={inputValues.openai ? "text-green-600 font-medium" : "text-muted-foreground"}>
                    {inputValues.openai ? "🟢 Custom Key Set" : "⚪ Not Configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Anthropic:</span>
                  <span className={inputValues.anthropic ? "text-green-600 font-medium" : "text-muted-foreground"}>
                    {inputValues.anthropic ? "🟢 Custom Key Set" : "⚪ Not Configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Mistral:</span>
                  <span className={inputValues.mistral ? "text-green-600 font-medium" : "text-muted-foreground"}>
                    {inputValues.mistral ? "🟢 Custom Key Set" : "⚪ Not Configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Groq:</span>
                  <span className={inputValues.groq ? "text-green-600 font-medium" : "text-muted-foreground"}>
                    {inputValues.groq ? "🟢 Custom Key Set" : "⚪ Not Configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>NVIDIA:</span>
                  <span className={inputValues.nvidia ? "text-green-600 font-medium" : "text-muted-foreground"}>
                    {inputValues.nvidia ? "🟢 Custom Key Set" : "⚪ Not Configured"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Keys are stored locally in your browser and are never sent to our servers.
            </p>

            <DialogFooter className="pt-4 border-t border-zinc-900">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </DialogFooter>
          </TabsContent>
          )}

          {show2FA && (
            <TabsContent value="security" className="outline-none">
              <TwoFactorSetup />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
