import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, Date.now() + '-' + originalName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and Excel files (.pdf, .xlsx, .xls) are allowed'), false);
  }
};
const upload = multer({ storage, fileFilter });
export default upload;
