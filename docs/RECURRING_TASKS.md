# Recurring Tasks Feature

## Overview
This implementation adds recurring task functionality to Priority Compass. Tasks can now be set to repeat on various schedules (daily, weekly, monthly, yearly, or custom).

## Database Migration
Run the migration file located at:
```
supabase/migrations/20260412000000_recurring_tasks.sql
```

### New Fields Added to `tasks` table:
- `recurrence_type` TEXT — 'daily', 'weekly', 'monthly', 'yearly', 'custom'
- `recurrence_interval` INT DEFAULT 1 — every N days/weeks/months
- `recurrence_end_date` DATE — optional end date for recurrence
- `recurrence_weekdays` INT[] — array of weekdays (0-6, Sunday-Saturday) for custom recurrence
- `parent_task_id` UUID — reference to the template task for instance tasks
- `skipped_dates` DATE[] — array of dates to skip
- `is_recurrence_template` BOOLEAN — marks if this is a template for recurring instances

## Features

### 1. Recurrence Picker
Located in `components/tasks/RecurrenceSelector.tsx`

**Quick presets:**
- Daily
- Every 2 days
- Weekly
- Every 2 weeks
- Monthly
- Yearly

**Custom options:**
- Set custom intervals (e.g., every 3 weeks)
- Select specific weekdays (e.g., Mon/Wed/Fri)
- Set an optional end date

### 2. Task Form Integration
The task form now includes a recurrence section. When creating a task, you can:
1. Select a recurrence type
2. Set the interval
3. Choose specific days (for weekly/custom)
4. Set an optional end date

### 3. Visual Indicators
- Recurring tasks display a "Repeats" badge with the recurrence pattern
- Purple color coding for recurrence-related UI elements
- Task list shows recurrence pattern under task title
- Task detail page shows full recurrence info with next occurrence date

### 4. Auto-Create Next Instance
When a recurring task is completed:
1. The current task is marked as done
2. A new task instance is automatically created with:
   - The next scheduled date/time
   - Reference to the parent template
   - Same priority, duration, and settings

### 5. Skip Functionality
Tasks can have specific dates skipped:
```typescript
import { skipRecurringInstance, unskipRecurringInstance } from '@/lib/tasks';

// Skip a specific date
await skipRecurringInstance(taskId, dateToSkip);

// Unskip a date
await unskipRecurringInstance(taskId, dateToUnskip);
```

### 6. Focus Timer Integration
The Focus Timer page now shows recurring task templates in a dedicated section:
- Separate "Recurring tasks" section in task selector
- Purple icon indicator for recurring tasks
- Shows recurrence type (Daily, Weekly, etc.)

### 7. Recurring Tasks Page
New page at `/tasks/recurring` that shows:
- All recurring task templates
- Next occurrence date for each
- End date if set
- Quick access to edit/delete

## Usage

### Creating a Recurring Task
1. Go to Tasks page
2. Click "New Task"
3. Fill in task details
4. In the "Recurrence" section, select:
   - Quick preset (Daily/Weekly/Monthly/Yearly)
   - OR choose "Custom" for advanced options
5. Optionally set an end date

### Viewing Recurring Tasks
1. Go to `/tasks/recurring` to see all templates
2. Or filter on the main tasks page (recurring tasks show the 🔄 icon)

### Completing a Recurring Task
1. Complete the task normally
2. The next instance is automatically created based on the recurrence pattern

## API Functions

### `lib/tasks.ts` exports:
```typescript
// Get all recurring task templates
getRecurringTaskTemplates(userId: string): Promise<Task[]>

// Get instances of a recurring task
getRecurringTaskInstances(userId: string, parentTaskId: string): Promise<Task[]>

// Skip a specific date
skipRecurringInstance(taskId: string, skipDate: Date): Promise<Task | null>

// Unskip a date
unskipRecurringInstance(taskId: string, skipDate: Date): Promise<Task | null>
```

### `lib/recurrence.ts` exports:
```typescript
// Calculate next occurrence date
getNextOccurrence(config: RecurrenceConfig, fromDate?: Date): Date | null

// Get occurrences in a date range
getOccurrencesInRange(config: RecurrenceConfig, startDate: Date, endDate: Date): Date[]

// Create task instance from template
createTaskInstanceFromTemplate(template: Task, instanceDate: Date): Omit<Task, 'id' | 'created_at' | 'updated_at'>

// Format recurrence for display
formatRecurrence(task: Task): string

// Check if date is skipped
isDateSkipped(skippedDates: string[] | null, date: Date): boolean

// Get human-readable next occurrence text
getNextOccurrenceText(task: Task): string | null
```

## Type Updates

### `types/index.ts`:
```typescript
export type RecurrenceType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export interface Task {
  // ... existing fields ...
  
  // Recurrence fields
  recurrence_type: RecurrenceType | null;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  recurrence_weekdays: number[] | null;
  parent_task_id: string | null;
  skipped_dates: string[] | null;
  is_recurrence_template: boolean;
}
```

## Future Enhancements
- [ ] Bulk skip dates from calendar view
- [ ] Recurring task analytics
- [ ] Edit all future instances
- [ ] Pause/resume recurring tasks
- [ ] More recurrence patterns (e.g., "first Monday of month")