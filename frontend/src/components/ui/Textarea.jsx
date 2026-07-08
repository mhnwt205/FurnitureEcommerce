import React from 'react';

const Textarea = React.forwardRef(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`ui-textarea ${className}`.trim()} {...props} />;
});

export default Textarea;