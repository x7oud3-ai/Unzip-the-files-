document.addEventListener('DOMContentLoaded', () => {
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

  // --- أحداث الإسقاط والرفع ---
  extractDropZone.addEventListener('click', () => extractInput.click());
  extractInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleExtract(e.target.files[0]);
    }
  });

  // --- معالجة فك الضغط المستقرة ---
  async function handleExtract(file) {
    extractList.innerHTML = '';
    extractList.style.display = 'none';
    extractStatus.innerText = 'جاري معالجة الملف...';

    const ext = file.name.split('.').pop().toLowerCase();

    try {
      if (ext === 'zip') {
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
      } else {
        extractStatus.innerText = 'تنبيه: المتصفحات تدعم فك ضغط ZIP المباشر بطلب استقرار عالي. يرجى توفير ملفات ZIP.';
      }
    } catch (err) {
      console.error(err);
      extractStatus.innerText = 'فشل في قراءة الملف. قد يكون الملف معطوباً أو محمياً بكلمة سر.';
    }
  }

  function renderFileItem(filename, blob) {
    const item = document.createElement('div');
    item.className = 'file-item';

    const nameSpan = document.createElement('span');
    nameSpan.innerText = filename;

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    // زر المعاينة
    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn-sm btn-preview';
    previewBtn.innerText = 'معاينة';
    previewBtn.onclick = () => previewFile(filename, blob);

    // قائمة خيارات تحويل صيغ الصور
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

    // زر التنزيل
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

  // --- معاينة المحتوى ---
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

  // --- تحويل صيغ الصور ---
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

  // --- ضغط الملفات ---
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
