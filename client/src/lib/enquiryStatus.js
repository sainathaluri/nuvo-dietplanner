// Single source of truth for enquiry status labels — shared by the pipeline board (columns +
// card dropdown) and the detail drawer's history timeline. "closed" is relabeled "Unsuccessful"
// to match the business language in the spec; the underlying enum value is unchanged.
export const STATUS_LABEL = {
  new: 'New enquiry',
  contacted: 'Contacted',
  'follow-up': 'Follow-up',
  converted: 'Converted',
  closed: 'Unsuccessful',
};

export const STATUSES = Object.keys(STATUS_LABEL);
