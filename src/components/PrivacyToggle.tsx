import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

interface PrivacyToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const PrivacyToggle = ({ 
  id, 
  label, 
  description, 
  checked, 
  onCheckedChange 
}: PrivacyToggleProps) => {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-card hover:bg-muted/50 transition-colors">
      <div className="flex-1 space-y-1">
        <Label htmlFor={id} className="text-base font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-1"
      />
    </div>
  );
};
