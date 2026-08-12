document.addEventListener('DOMContentLoaded', () => {
  // تهيئة محرك WebAssembly الشامل للتعامل مع Web Workers فورياً
  if (window.Archive) {
    Archive.init({
      workerUrl: 'https://cdn.jsdelivr.net/npm/libarchive.js/dist/worker-bundle.js'
    });
  }

  // --- عناصر الواجهة ---
  const btnTabExtract = document.getElementById('btn-tab-extract');
  const btnTabCompress = document.getElementById('btn-tab-compress');
  const extractTab = document.getElementById('extract-tab');
  const compressTab = document.getElementById('compress-tab');

  const extractDropZone = document.getElementById('extract-drop-zone');
  const extractInput = document.getElementById('extract-input');
  const extractStatus = document.getElementById('extract-status');
  const extractList = document.getElementById('extract-list');

  const compressDropZone = document.getElementById('compress-drop-zone');
  const compressInput = document.getElementById('compress-input');
  const compressList = document.getElementById('selected-compress-files');
  const btnStartCompress = document.getElementById('btn-start-compress');
  const compressStatus = document.getElementById('compress-status');

  const previewModal = document.getElementById('preview-modal');
  const previewTitle = document.getElementById('preview-title');
  const previewBody = document.getElementById('preview-body');
  const btnClosePreview = document.getElementById('btn-close-preview');

  let filesToCompress = [];

  // --- التبديل بين التبويبات ---
  btnTabExtract.addEventListener('click', () => switchTab('extract'));
  btnTabCompress.addEventListener('click', () => switchTab('compress'));

  function switchTab(tab) {
    if (tab === 'extract') {
      btnTabExtract.classList.add('active');
      btnTabCompress.classList.remove('active');
      extractTab.classList.add('active');
      compressTab.classList.remove('active');
    } else {
      btnTabCompress.classList.add('active');
      btnTabExtract.classList.remove('active');
      compressTab.classList.add('active');
      extractTab.classList.remove('active');
    }
  }

  // --- رفع الملفات ---
  extractDropZone.addEventListener('click', () => extractInput.click());
  extractInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleExtract(e.target.files[0]);
    }
  });

  // --- فك ضغط شامل وبشكل ثابت ومستقر ---
  async function handleExtract(file) {
    extractList.innerHTML = '';
    extractList.style.display = 'none';
    extractStatus.innerText = 'جاري معالجة الملف واستخراجه بواسطة WebAssembly...';

    const ext = file.name.split('.').pop().toLowerCase();

    // 1. معالجة سريعة لـ ZIP
    if (ext === 'zip') {
      try {
        const zip = new JSZip();
        const zipData = await zip.loadAsync(file);
        
        extractStatus.innerText = 'تم فك الضغط بنجاح!';
        extractList.style.display = 'block';

        const fileNames = Object.keys(zipData.files);
        for (let name of fileNames) {
          const entry = zipData.files[name];
          if (!entry.dir) {
            const blob = await entry.async('blob');
            renderFileItem(entry.name, blob);
          }
        }
      } catch (err) {
        console.error(err);
        extractStatus.innerText = 'حدث خطأ أثناء فك ضغط ملف ZIP.';
      }
    } 
    // 2. معالجة فائقة القوة لـ (RAR, 7Z, TAR, GZ) بواسطة LibArchive WebAssembly
    else {
      try {
        const archive = await Archive.open(file);
        const filesObj = await archive.extractFiles();

        extractStatus.innerText = 'تم فك الضغط بنجاح!';
        extractList.style.display = 'block';

        await walkExtractedFiles(filesObj, '');
      } catch (err) {
        console.error(err);
        extractStatus.innerText = 'فشل في فك الضغط. تأكد أن الملف ليس مشفراً بكلمة سر أو معطوباً.';
      }
    }
  }

  // دالة متكررة لتفريغ مجلدات RAR و 7Z المعقدة
  async function walkExtractedFiles(obj, path) {
    for (let key in obj) {
      const item = obj[key];
      const fullPath = path ? `${path}/${key}` : key;
      if (item instanceof File) {
        renderFileItem(fullPath, item);
      } else if (typeof item === 'object') {
        await walkExtractedFiles(item, fullPath);
      }
    }
  }

  function renderFileItem(filename, blob) {
    const item = document.createElement('div');
    item.className = 'file-item';

    const nameSpan = document.createElement('span');
    nameSpan.innerText = filename;

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    // المعاينة
    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn-sm btn-preview';
    previewBtn.innerText = 'معاينة';
    previewBtn.onclick = () => previewFile(filename, blob);

    // التحويل
    const ext = filename.split('.').pop().toLowerCase();
    let convertSelect = null;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      convertSelect = document.createElement('select');
      convertSelect.style.padding = '4px';
      convertSelect.style.fontSize = '12px';
      convertSelect.innerHTML = `
        <option value="">الصيغة الأصلية</option>
        <option value="image/png">PNG</option>
        <option value="image/jpeg">JPG</option>
        <option value="image/webp">WEBP</option>
      `;
    }

    // التنزيل
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-sm btn-download';
    downloadBtn.innerText = 'تحميل';
    downloadBtn.onclick = () => {
      if (convertSelect && convertSelect.value) {
        convertImageAndDownload(blob, filename, convertSelect.value);
      } else {
        saveAs(blob, filename);
      }
    };

    actions.appendChild(previewBtn);
    if (convertSelect) actions.appendChild(convertSelect);
    actions.appendChild(downloadBtn);

    item.appendChild(nameSpan);
    item.appendChild(actions);
    extractList.appendChild(item);
  }

  // --- المعاينة ---
  function previewFile(filename, blob) {
    previewTitle.innerText = filename;
    previewBody.innerHTML = '';

    const ext = filename.split('.').pop().toLowerCase();

    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(blob);
      previewBody.appendChild(img);
    } else if (['txt', 'json', 'html', 'css', 'js', 'md', 'xml', 'csv'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const pre = document.createElement('pre');
        pre.innerText = e.target.result;
        previewBody.appendChild(pre);
      };
      reader.readAsText(blob);
    } else {
      previewBody.innerHTML = '<p style="color:#64748b;">المعاينة المباشرة غير متاحة لهذه الصيغة. استخدم زر التحميل بدلاً من ذلك.</p>';
    }

    previewModal.style.display = 'flex';
  }

  btnClosePreview.addEventListener('click', () => {
    previewModal.style.display = 'none';
  });

  // --- التحويل ---
  function convertImageAndDownload(blob, filename, targetMime) {
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((newBlob) => {
        const newExt = targetMime.split('/')[1];
        const baseName = filename.substring(0, filename.lastIndexOf('.'));
        saveAs(newBlob, `${baseName}.${newExt}`);
      }, targetMime);
    };
  }

  // --- الضغط ---
  compressDropZone.addEventListener('click', () => compressInput.click());
  compressInput.addEventListener('change', (e) => {
    filesToCompress = Array.from(e.target.files);
    compressList.innerHTML = '';
    compressList.style.display = 'block';

    filesToCompress.forEach(f => {
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerText = `${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
      compressList.appendChild(item);
    });
  });

  btnStartCompress.addEventListener('click', () => {
    if (!filesToCompress.length) {
      alert('يرجى اختيار ملف واحد على الأقل لضغطها');
      return;
    }

    compressStatus.innerText = 'جاري عملية الضغط...';

    const zip = new JSZip();
    filesToCompress.forEach(file => {
      zip.file(file.name, file);
    });

    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'archive.zip');
      compressStatus.innerText = 'تم الضغط والتحميل بنجاح!';
    }).catch(err => {
      console.error(err);
      compressStatus.innerText = 'حدث خطأ أثناء الضغط.';
    });
  });
});
