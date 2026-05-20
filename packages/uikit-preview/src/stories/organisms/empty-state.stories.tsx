import { EmptyState } from "@archon-research/design-system";

import { css } from "../../../styled-system/css";

export default {
  title: "Organisms/Empty State",
};

const wrapperClassName = css({
  display: "grid",
  gap: "4",
  p: "6",
  maxWidth: "2xl",
});

const actionClassName = css({
  borderRadius: "sm",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  background: "surface.default",
  color: "text.default",
  fontSize: "sm",
  px: "3",
  py: "2",
});

export const Default = () => (
  <div className={wrapperClassName}>
    <EmptyState
      title="No records found"
      description="Try updating your filters to broaden the result set."
    />
  </div>
);

export const CompactWithAction = () => (
  <div className={wrapperClassName}>
    <EmptyState
      title="No events yet"
      description="Events will appear here once indexing catches up."
      size="compact"
      action={<button className={actionClassName}>Refresh</button>}
    />
  </div>
);
