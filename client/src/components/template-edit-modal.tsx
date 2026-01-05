import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Template } from "@shared/schema";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["email", "call_script", "follow_up"]),
  subject: z.string().optional(),
  body: z.string().min(1, "Body is required"),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateEditModalProps {
  open: boolean;
  onClose: () => void;
  template: Template | null;
  isCreate: boolean;
}

export function TemplateEditModal({
  open,
  onClose,
  template,
  isCreate,
}: TemplateEditModalProps) {
  const { toast } = useToast();
  const isEditingDefault = template?.isDefault && !isCreate;

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      type: "email",
      subject: "",
      body: "",
    },
  });

  useEffect(() => {
    if (template && !isCreate) {
      form.reset({
        name: isEditingDefault ? `${template.name} (Copy)` : template.name,
        type: template.type as TemplateFormData["type"],
        subject: template.subject || "",
        body: template.body,
      });
    } else {
      form.reset({
        name: "",
        type: "email",
        subject: "",
        body: "",
      });
    }
  }, [template, isCreate, form, isEditingDefault]);

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest("POST", "/api/templates", {
        ...data,
        subject: data.subject || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: isEditingDefault ? "Template copied!" : "Template created!" });
      onClose();
    },
    onError: () => {
      toast({
        title: "Failed to save template",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest("PUT", `/api/templates/${template!.id}`, {
        ...data,
        subject: data.subject || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template updated!" });
      onClose();
    },
    onError: () => {
      toast({
        title: "Failed to update template",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    if (isCreate || isEditingDefault) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const watchType = form.watch("type");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "Create Template" : isEditingDefault ? "Copy Template" : "Edit Template"}
          </DialogTitle>
          <DialogDescription>
            Use placeholders like [NAME], [COMPANY], [ROLE] for personalization
          </DialogDescription>
        </DialogHeader>

        {isEditingDefault && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is a default template. Saving will create a copy.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Initial Outreach - Tech Roles"
                      {...field}
                      data-testid="input-template-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-template-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="call_script">Call Script</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === "email" && (
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Quick question about [COMPANY]"
                        {...field}
                        data-testid="input-template-subject"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your template content here..."
                      className="min-h-[200px] resize-y"
                      {...field}
                      data-testid="input-template-body"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-template">
                {isPending ? "Saving..." : isEditingDefault ? "Save as Copy" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
