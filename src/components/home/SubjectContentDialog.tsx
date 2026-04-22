import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import ThemeManager from "./ThemeManager";
import SubjectComments from "./SubjectComments";

interface SubjectContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectLabel: string;
  subjectIcon: string;
  subjectColor: string;
  manageMode?: boolean;
}

const SubjectContentDialog = ({ open, onOpenChange, subjectId, subjectLabel, subjectIcon, manageMode }: SubjectContentDialogProps) => {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const { scrollRef, showScrollTop, handleScroll, scrollToTop } = useScrollToTop();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-[85vh] overflow-y-auto p-6 space-y-4"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{subjectIcon}</span>
              <span>{subjectLabel}</span>
            </DialogTitle>
          </DialogHeader>

          {isAdmin && manageMode ? (
            <div className="space-y-4">
              <ThemeManager subjectId={subjectId} manageMode={true} />
            </div>
          ) : (
            <SubjectComments subjectId={subjectId} subjectLabel={subjectLabel} />
          )}
        </div>

        <ScrollToTopButton show={showScrollTop} onClick={scrollToTop} />
      </DialogContent>
    </Dialog>
  );
};

export default SubjectContentDialog;
