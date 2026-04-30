import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  useCreateBill,
  useUpdateBill,
  Bill,
  BillCategory,
  BillStatus,
} from "@workspace/api-client-react";
import { useInvalidateHouseholdData } from "@/lib/api-hooks";
import { useActiveHousehold } from "@/lib/active-household";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const billSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.nativeEnum(BillCategory),
  amount: z.coerce.number().min(0, "Amount must be positive"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  autopay: z.boolean(),
  status: z.nativeEnum(BillStatus),
  priority: z.coerce.number().min(1).max(5),
  lateFee: z.coerce.number().min(0),
  shutoffRisk: z.boolean(),
  notes: z.string(),
});

type BillFormValues = z.infer<typeof billSchema>;

interface BillFormProps {
  bill?: Bill;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BillForm({ bill, onSuccess, onCancel }: BillFormProps) {
  const { householdId } = useActiveHousehold();
  const invalidate = useInvalidateHouseholdData();
  const createBill = useCreateBill();
  const updateBill = useUpdateBill();

  const isEditing = !!bill;

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: bill ? {
      name: bill.name,
      category: bill.category,
      amount: bill.amount,
      dueDate: bill.dueDate.split('T')[0],
      autopay: bill.autopay,
      status: bill.status,
      priority: bill.priority,
      lateFee: bill.lateFee,
      shutoffRisk: bill.shutoffRisk,
      notes: bill.notes,
    } : {
      name: "",
      category: BillCategory.housing,
      amount: 0,
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      autopay: false,
      status: BillStatus.unpaid,
      priority: 3,
      lateFee: 0,
      shutoffRisk: false,
      notes: "",
    }
  });

  const onSubmit = (data: BillFormValues) => {
    if (householdId == null) return;
    if (isEditing) {
      updateBill.mutate(
        { householdId, billId: bill.id, data },
        {
          onSuccess: () => {
            invalidate();
            onSuccess?.();
          },
        },
      );
    } else {
      createBill.mutate(
        { householdId, data },
        {
          onSuccess: () => {
            invalidate();
            form.reset();
            onSuccess?.();
          },
        },
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bill Name</FormLabel>
                <FormControl>
                  <Input placeholder="Electric Bill" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date (YYYY-MM-DD)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(BillCategory).map((cat) => (
                      <SelectItem key={cat} value={cat} className="capitalize">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(BillStatus).map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority (1-5)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((p) => (
                      <SelectItem key={p} value={p.toString()}>
                        {p} - {p === 1 ? "Lowest" : p === 5 ? "Highest" : "Medium"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lateFee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Late Fee ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col space-y-4 pt-2">
            <FormField
              control={form.control}
              name="autopay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                  <div className="space-y-0.5">
                    <FormLabel>Autopay</FormLabel>
                    <FormDescription>Is this on automatic payment?</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shutoffRisk"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-card">
                  <div className="space-y-0.5">
                    <FormLabel className="text-destructive">Shutoff Risk</FormLabel>
                    <FormDescription>Will this service be suspended if unpaid?</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Add any details about this bill..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createBill.isPending || updateBill.isPending}
          >
            {createBill.isPending || updateBill.isPending ? "Saving..." : isEditing ? "Update Bill" : "Add Bill"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
