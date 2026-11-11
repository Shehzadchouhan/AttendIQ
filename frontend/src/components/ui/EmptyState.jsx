import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There is currently no data to display.',
  action,
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
      {action && <div className="ui-empty-state-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
