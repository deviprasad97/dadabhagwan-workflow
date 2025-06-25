import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, XCircle, Clock, CheckCheck } from 'lucide-react';
import type { PrintStatus } from '@/lib/types';

interface PrintStatusBadgeProps {
  printStatus?: PrintStatus;
  assigneeUid?: string;
  reviewerName?: string;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
}

export function PrintStatusBadge({ 
  printStatus, 
  assigneeUid,
  reviewerName, 
  size = 'sm', 
  showTooltip = true 
}: PrintStatusBadgeProps) {
  // If card is not assigned to "for-review", show "No approval required"
  if (assigneeUid !== 'for-review') {
    const badge = (
      <Badge 
        variant="outline" 
        className={`${size === 'sm' ? 'text-xs' : 'text-sm'} flex items-center gap-1 text-green-600 border-green-300 bg-green-50`}
      >
        <CheckCheck className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
        No approval required
      </Badge>
    );
    
    if (!showTooltip) return badge;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>This card can be printed without admin approval</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // For cards assigned to "for-review", use the existing print status logic
  if (!printStatus) {
    // Default to pending if no status is set
    const badge = (
      <Badge 
        variant="outline" 
        className={`${size === 'sm' ? 'text-xs' : 'text-sm'} flex items-center gap-1 text-yellow-600 border-yellow-300 bg-yellow-50`}
      >
        <Clock className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
        Pending Review
      </Badge>
    );
    
    if (!showTooltip) return badge;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>Awaiting admin approval for printing</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  let badge;
  let tooltipContent;

  switch (printStatus.status) {
    case 'approved':
      badge = (
        <Badge 
          variant="outline" 
          className={`${size === 'sm' ? 'text-xs' : 'text-sm'} flex items-center gap-1 text-green-600 border-green-300 bg-green-50`}
        >
          <CheckCircle className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
          Approved
        </Badge>
      );
      tooltipContent = (
        <div className="space-y-1">
          <p>Print Status: Approved</p>
          {reviewerName && <p className="text-xs">Approved by: {reviewerName}</p>}
          {printStatus.reviewedAt && (
            <p className="text-xs">
              On: {new Date(printStatus.reviewedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      );
      break;
      
    case 'rejected':
      badge = (
        <Badge 
          variant="outline" 
          className={`${size === 'sm' ? 'text-xs' : 'text-sm'} flex items-center gap-1 text-red-600 border-red-300 bg-red-50`}
        >
          <XCircle className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
          Rejected
        </Badge>
      );
      tooltipContent = (
        <div className="space-y-1">
          <p>Print Status: Rejected</p>
          {reviewerName && <p className="text-xs">Rejected by: {reviewerName}</p>}
          {printStatus.comment && <p className="text-xs">Reason: {printStatus.comment}</p>}
          {printStatus.reviewedAt && (
            <p className="text-xs">
              On: {new Date(printStatus.reviewedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      );
      break;
      
    case 'pending':
    default:
      badge = (
        <Badge 
          variant="outline" 
          className={`${size === 'sm' ? 'text-xs' : 'text-sm'} flex items-center gap-1 text-yellow-600 border-yellow-300 bg-yellow-50`}
        >
          <Clock className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
          Pending Review
        </Badge>
      );
      tooltipContent = <p>Awaiting admin approval for printing</p>;
      break;
  }

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 