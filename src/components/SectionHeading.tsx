import { ChevronDown } from 'lucide-react';
import type { ModelCollection } from '../modelQuiz';
import { studyUnits, type StudySection } from '../studySections';

const collectionNames = { muscles: 'Muscles', skeleton: 'Bones', landmarks: 'Landmarks' };

export default function SectionHeading({ collection, section, custom = false, onChange }: {
  collection: ModelCollection;
  section?: StudySection;
  custom?: boolean;
  onChange: () => void;
}) {
  const unit = section && studyUnits.find(item => item.sections.includes(section));
  const title = section?.title ?? (custom ? 'Custom selection' : `All ${collectionNames[collection].toLowerCase()}`);
  return <div className="stage-heading section-heading">
    <button className="section-heading-button" onClick={onChange} aria-label={`Change section: ${title}`} aria-haspopup="dialog">
      <span><small>{unit?.title ?? collectionNames[collection]}</small><strong>{title}</strong></span>
      <ChevronDown size={19}/>
    </button>
  </div>;
}
