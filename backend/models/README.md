# Model Weights Directory

Place your trained model weights (`.pt` or `.pth` file) in this directory:

### Accepted File Names:
- `hybrid_model_epoch_25_final.pt`
- `hybrid_model_epoch_25_final.pth`
- `hybrid_model.pth`
- `hybrid_model.pt`

### How to download from Kaggle / Google Colab:
1. **From Kaggle**:
   - The notebook `QEMNet.ipynb` saves weights to `/kaggle/working/hybrid_model_epoch_25_final.pt`.
   - In the Kaggle notebook UI, click the **Data / Output** panel on the right sidebar.
   - Find `hybrid_model_epoch_25_final.pt` and click the Download icon.
   - Or run in a Kaggle notebook cell:
     ```python
     from IPython.display import FileLink
     FileLink(r'hybrid_model_epoch_25_final.pt')
     ```
2. **From Google Colab**:
   - Add this cell to download directly to your PC:
     ```python
     from google.colab import files
     files.download('/content/hybrid_model_epoch_25_final.pt')
     ```

Once downloaded, copy the file into this folder (`backend/models/`).
The FastAPI backend will automatically detect and load it!
