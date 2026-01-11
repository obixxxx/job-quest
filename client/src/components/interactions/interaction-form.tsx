import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, MessageSquare, Phone, Coffee, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Contact } from "@shared/schema";

const interactionTypes = [
  { value: "email", label: "Email", icon: Mail },
  { value: "linkedin_dm", label: "LinkedIn DM", icon: MessageSquare },
  { value: "call", label: "Phone Call", icon: Phone },
  { value: "coffee", label: "Coffee Chat", icon: Coffee },
  { value: "text", label: "Text/SMS", icon: Send },
  { value: "comment", label: "Comment", icon: MessageSquare },
  { value: "physical_letter", label: "Letter", icon: FileText },
];

const outcomes = [
  { value: "response_received", label: "Got a response", xp: 15, os: 5 },
  { value: "referral_obtained", label: "Got a referral", xp: 50, os: 25 },
  { value: "intro_obtained", label: "Got an intro", xp: 30, os: 15 },
  { value: "intel_gathered", label: "Gathered intel", xp: 20, os: 10 },
  { value: "no_response", label: "No response yet", xp: 10, os: 0 },
];

const interactionFormSchema = z.object({
  type: z.enum(["email", "linkedin_dm", "call", "coffee", "text", "comment", "physical_letter"]),
  direction: z.enum(["outbound", "inbound"]),
  outcome: z.enum(["response_received", "referral_obtained", "intro_obtained", "intel_gathered", "no_response"]).optional(),
  outcomeDetails: z.string().optional(),
  messageContent: z.string().optional(),
});

type InteractionFormValues = z.infer<typeof interactionFormSchema>;

interface InteractionFormProps {
  contact: Contact;
  onSubmit: (data: InteractionFormValues) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function InteractionForm({ contact, onSubmit, onCancel, isPending }: InteractionFormProps) {
  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: {
      type: "email",
      direction: "outbound",
      outcome: undefined,
      outcomeDetails: "",
      messageContent: "",
    },
  });

  const selectedOutcome = form.watch("outcome");
  const outcomeData = outcomes.find((o) => o.value === selectedOutcome);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="pb-4 border-b border-border">
          <p className="text-sm text-muted-foreground">Logging interaction with</p>
          <p className="font-semibold text-lg">{contact.name}</p>
          {contact.company && <p className="text-sm text-muted-foreground">{contact.company}</p>}
        </div>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interaction Type</FormLabel>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {interactionTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = field.value === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => field.onChange(type.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-md border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      data-testid={`button-type-${type.value}`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-xs">{type.label}</span>
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direction</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-direction">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="outbound">I reached out to them</SelectItem>
                  <SelectItem value="inbound">They reached out to me</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outcome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Outcome</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="space-y-2"
                >
                  {outcomes.map((outcome) => (
                    <div
                      key={outcome.value}
                      className={`flex items-center justify-between p-3 rounded-md border transition-colors ${
                        field.value === outcome.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem
                          value={outcome.value}
                          id={outcome.value}
                          data-testid={`radio-outcome-${outcome.value}`}
                        />
                        <Label htmlFor={outcome.value} className="cursor-pointer font-normal">
                          {outcome.label}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-game-xp">+{outcome.xp} XP</span>
                        {outcome.os > 0 && (
                          <span className="font-mono text-xs text-game-os">+{outcome.os} OS</span>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="outcomeDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What happened? Any key takeaways?"
                  className="min-h-[80px]"
                  {...field}
                  data-testid="textarea-outcome-details"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {outcomeData && (
          <div className="bg-muted/50 rounded-md p-4">
            <p className="text-sm text-muted-foreground mb-2">You'll earn:</p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xl font-bold text-game-xp">
                +{outcomeData.xp} XP
              </span>
              {outcomeData.os > 0 && (
                <span className="font-mono text-xl font-bold text-game-os">
                  +{outcomeData.os} OS
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-interaction">
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !selectedOutcome} data-testid="button-save-interaction">
            <Send className="w-4 h-4 mr-2" />
            {isPending ? "Logging..." : "Log Interaction"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
