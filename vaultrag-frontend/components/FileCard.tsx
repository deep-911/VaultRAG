import React from 'react';
import { FileText, FileCode, FileSpreadsheet, Image, File } from 'lucide-react';
import { motion } from 'framer-motion';

type FileTypeKey = keyof typeof FILE_TYPE_CONFIG;

const FILE_TYPE_CONFIG = {
  pdf: { icon: FileText, className: 'file-card__icon--pdf' },
  doc: { icon: FileText, className: 'file-card__icon--doc' },
  code: { icon: FileCode, className: 'file-card__icon--code' },
  spreadsheet: { icon: FileSpreadsheet, className: 'file-card__icon--spreadsheet' },
  image: { icon: Image, className: 'file-card__icon--image' },
  default: { icon: File, className: 'file-card__icon--default' },
};

function getScoreClass(score: number): string {
  if (score >= 75) return 'file-card__score--high';
  if (score >= 45) return 'file-card__score--medium';
  return 'file-card__score--low';
}

export type FileCardItem = {
  filename: string;
  size: string;
  lastModified: string;
  relevanceScore: number;
  snippet: string;
  type: FileTypeKey;
};

export default function FileCard({
  file,
  index = 0,
}: {
  file: FileCardItem;
  index?: number;
}) {
  const typeConfig = FILE_TYPE_CONFIG[file.type] ?? FILE_TYPE_CONFIG.default;
  const IconComponent = typeConfig.icon;

  return (
    <motion.div
      className="file-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="file-card__header">
        <div className={`file-card__icon ${typeConfig.className}`}>
          <IconComponent />
        </div>
        <div className="file-card__info">
          <div className="file-card__name">{file.filename}</div>
          <div className="file-card__meta">
            <span>{file.size}</span>
            <span>·</span>
            <span>{file.lastModified}</span>
          </div>
        </div>
        <div className={`file-card__score ${getScoreClass(file.relevanceScore)}`}>
          {file.relevanceScore}% match
        </div>
      </div>
      <div className="file-card__snippet">{file.snippet}</div>
    </motion.div>
  );
}
