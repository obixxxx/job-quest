import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Mail, Phone, MessageSquare, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateEditModal } from "@/components/template-edit-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Template } from "@shared/schema";

const TYPE_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  call_script: Phone,
  follow_up: MessageSquare,
};

const TYPE_LABELS: Record<string, string> = {
  email: "Email",
  call_script: "Call Script",
  follow_up: "Follow-up",
};

export default function TemplatesPage() {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [deleteTemplate, setDeleteTemplate] = useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template deleted" });
      setDeleteTemplate(null);
    },
    onError: () => {
      toast({
        title: "Failed to delete template",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const filteredTemplates = templates?.filter((t) => {
    if (typeFilter === "all") return true;
    return t.type === typeFilter;
  });

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template);
    setIsCreateMode(false);
    setIsEditModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsCreateMode(true);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedTemplate(null);
    setIsCreateMode(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Templates</h1>
          <p className="text-muted-foreground">Manage your outreach templates</p>
        </div>
        <Button onClick={handleCreate} data-testid="button-add-template">
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="call_script">Call Script</SelectItem>
            <SelectItem value="follow_up">Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filteredTemplates && filteredTemplates.length > 0 ? (
        <div className="space-y-4">
          {filteredTemplates.map((template) => {
            const Icon = TYPE_ICONS[template.type] || FileText;
            return (
              <Card key={template.id} className="hover-elevate" data-testid={`template-card-${template.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-md bg-muted">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{template.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {TYPE_LABELS[template.type] || template.type}
                        </Badge>
                        {template.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      {template.subject && (
                        <p className="text-sm text-muted-foreground mb-1">
                          Subject: {template.subject}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.body.slice(0, 150)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                        data-testid={`button-edit-${template.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!template.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTemplate(template)}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="font-semibold text-lg mb-2">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            Create your first template to get started
          </p>
          <Button onClick={handleCreate} data-testid="button-add-first-template">
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>
      )}

      <TemplateEditModal
        open={isEditModalOpen}
        onClose={handleModalClose}
        template={selectedTemplate}
        isCreate={isCreateMode}
      />

      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTemplate?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplate && deleteMutation.mutate(deleteTemplate.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
