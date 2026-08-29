import { useEffect, useState } from "react";
import { REPORT_CATEGORIES } from "../services/matchService";
import "./ReportPlayerModal.css";

type Props = {
  playerName: string;
  onClose: () => void;
  onSubmit: (
    category: string,
    details: string,
  ) => Promise<{ stored: boolean }>;
};

export default function ReportPlayerModal({
  playerName,
  onClose,
  onSubmit,
}: Props) {
  const [category, setCategory] = useState<string>(REPORT_CATEGORIES[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Close on Escape, and stop the page behind the splash from scrolling.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function handleSubmit() {
    if (submitting || !details.trim()) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const { stored } = await onSubmit(category, details.trim());
      setDone(true);
      setNotice(
        stored
          ? "Report submitted. Thanks for flagging it."
          : "Player reporting isn't available yet — your report was not saved.",
      );
    } catch (error) {
      setNotice(
        (error as Error).message || "Could not submit the report.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="report-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="report-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        <h2 id="report-modal-title">Report {playerName}</h2>

        {done ? (
          <>
            <p className="report-modal-notice">{notice}</p>
            <div className="report-modal-actions">
              <button
                type="button"
                className="report-modal-submit"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="report-modal-intro">
              Reports are reviewed by the organisers. Be specific and factual.
            </p>

            <label className="report-modal-field">
              <span>Reason</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {REPORT_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="report-modal-field">
              <span>What happened?</span>
              <textarea
                rows={5}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="When it happened, who was involved, and what was said or done."
              />
            </label>

            {notice && <p className="report-modal-notice">{notice}</p>}

            <div className="report-modal-actions">
              <button
                type="button"
                className="report-modal-cancel"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="report-modal-submit"
                onClick={handleSubmit}
                disabled={submitting || !details.trim()}
              >
                {submitting ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
