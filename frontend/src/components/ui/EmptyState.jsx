import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There is currently no data to display.',
  action,
  actionLabel,
  onAction,
  className = '',
  ...props
}) => {
  return (
    <div className={`ui-empty-state ${className}`} {...props}>
      <div className="ui-empty-state-icon" aria-hidden="true">
        {React.isValidElement(Icon) ? Icon : <Icon size={28} />}
      </div>
      <h4 className="ui-empty-state-title">{title}</h4>
      {description && <p className="ui-empty-state-description">{description}</p>}
      {(action || (actionLabel && onAction)) && (
        <div className="ui-empty-state-action" style={{ marginTop: '0.85rem' }}>
          {action || (
            <button
              type="button"
              className="ui-btn ui-btn--primary ui-btn--sm"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
