 import React from "react";
 import { format } from "date-fns";
 import { fr } from "date-fns/locale";
 import { Calendar as CalendarIcon } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Button } from "@/components/ui/button";
 import { Calendar } from "@/components/ui/calendar";
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from "@/components/ui/popover";
 
 interface FormDatePickerProps {
   value: string; // ISO date string (YYYY-MM-DD)
   onChange: (value: string) => void;
   placeholder?: string;
   required?: boolean;
   fromYear?: number;
   toYear?: number;
 }
 
 export const FormDatePicker: React.FC<FormDatePickerProps> = ({
   value,
   onChange,
   placeholder = "Sélectionner une date",
   required = false,
   fromYear = 2000,
   toYear = 2100,
 }) => {
   const date = value ? new Date(value) : undefined;
 
   const handleSelect = (selectedDate: Date | undefined) => {
     if (selectedDate) {
       // Format to YYYY-MM-DD for form compatibility
       const year = selectedDate.getFullYear();
       const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
       const day = String(selectedDate.getDate()).padStart(2, '0');
       onChange(`${year}-${month}-${day}`);
     }
   };
 
   return (
     <Popover>
       <PopoverTrigger asChild>
         <Button
           type="button"
           variant="outline"
           className={cn(
             "w-full justify-start text-left font-normal",
             !date && "text-muted-foreground"
           )}
         >
           <CalendarIcon className="mr-2 h-4 w-4" />
           {date ? format(date, "PPP", { locale: fr }) : placeholder}
         </Button>
       </PopoverTrigger>
       <PopoverContent className="w-auto p-0" align="start">
         <Calendar
           mode="single"
           selected={date}
           onSelect={handleSelect}
           initialFocus
           locale={fr}
           captionLayout="dropdown-buttons"
           fromYear={fromYear}
           toYear={toYear}
         />
       </PopoverContent>
     </Popover>
   );
 };