import { Copy, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
}

interface TemplateModalProps {
  template: Template | null;
  open: boolean;
  onClose: () => void;
  contactName?: string;
  contactEmail?: string;
  contactCompany?: string;
}

export function TemplateModal({
  template,
  open,
  onClose,
  contactName,
  contactEmail,
  contactCompany,
}: TemplateModalProps) {
  const { toast } = useToast();

  if (!template) return null;

  const replaceVariables = (text: string) => {
    return text
      .replace(/\[NAME\]/g, contactName || "[NAME]")
      .replace(/\[COMPANY\]/g, contactCompany || "[COMPANY]")
      .replace(/\[THEIR COMPANY\]/g, contactCompany || "[THEIR COMPANY]")
      .replace(/\[THEIR ROLE\]/g, "[THEIR ROLE]");
  };

  const processedSubject = template.subject ? replaceVariables(template.subject) : "";
  const processedBody = replaceVariables(template.body);

  const handleCopy = async () => {
    const fullText = template.subject
      ? `Subject: ${processedSubject}\n\n${processedBody}`
      : processedBody;

    await navigator.clipboard.writeText(fullText);
    toast({
      title: "Copied!",
      description: "Template copied to clipboard",
    });
  };

  const handleOpenGmail = () => {
    if (!contactEmail) {
      toast({
        title: "No email address",
        description: "This contact doesn't have an email address",
        variant: "destructive",
      });
      return;
    }

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      contactEmail
    )}&su=${encodeURIComponent(processedSubject)}&body=${encodeURIComponent(
      processedBody
    )}`;

    window.open(gmailUrl, "_blank");
  };

  const isEmailTemplate = template.type === "email" || template.type === "follow_up";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEmailTemplate ? <Mail className="w-5 h-5" /> : null}
            {template.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {template.subject && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Subject</p>
              <p className="text-sm bg-muted p-3 rounded-md">{processedSubject}</p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {template.type === "script" ? "Script" : "Body"}
            </p>
            <div className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {processedBody}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleCopy} variant="outline" data-testid="button-copy-template">
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
            {isEmailTemplate && (
              <Button onClick={handleOpenGmail} data-testid="button-open-gmail">
                <Mail className="w-4 h-4 mr-2" />
                Open in Gmail
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
