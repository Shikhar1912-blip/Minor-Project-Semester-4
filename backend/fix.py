import re
content = open("main.py", "r", encoding="utf-8").read()

bad_start = content.find("    Classify a water coverage percentage")
if bad_start != -1:
    # Find the end of this broken block
    bad_end = content.find('    risk = alert_service.classify_risk(request.water_percentage)\n    return {"status": "success", "risk": risk}', bad_start)
    if bad_end != -1:
        bad_end += len('    risk = alert_service.classify_risk(request.water_percentage)\n    return {"status": "success", "risk": risk}')
        
        replacement = """@app.get("/api/model/predictions/{filename}")
async def get_prediction_image(filename: str):
    \"\"\"Serve a saved prediction visualisation image.\"\"\"
    path = PRED_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Prediction file not found")
    return FileResponse(str(path), media_type="image/png")


@app.get("/api/model/info")
async def get_model_info():
    \"\"\"Return metadata of the current best model checkpoint.\"\"\"
    best = MODEL_DIR / "best_model.pth"
    if not best.exists():
        return {"status": "no_model", "message": "No trained model yet"}

    import torch
    ckpt = torch.load(str(best), map_location="cpu", weights_only=False)
    return {
        "status":          "ready",
        "epoch":           ckpt.get("epoch"),
        "val_iou":         round(ckpt.get("val_iou", 0), 4),
        "val_f1":          round(ckpt.get("val_f1",  0), 4),
        "ndwi_threshold":  ckpt.get("ndwi_threshold", 0.3),
        "model_size_kb":   round(best.stat().st_size / 1024, 1),
    }


# ============================================================
#  Weeks 6-8 — Alert System & Risk Mapping Endpoints
# ============================================================

class ClassifyRequest(BaseModel):
    water_percentage: float


@app.post("/api/alerts/classify")
async def classify_risk(request: ClassifyRequest):
    \"\"\"
    Classify a water coverage percentage into a risk level.

    Returns Low / Moderate / High / Critical with color, description,
    and recommended action.
    \"\"\"
    risk = alert_service.classify_risk(request.water_percentage)
    return {"status": "success", "risk": risk}"""

        # new_content = content[:bad_start] + replacement + content[bad_end:]
        # open("main.py", "w", encoding="utf-8").write(new_content)
        print("Successfully patched main.py")
    else:
        print("Could not find end of bad block")
else:
    print("Could not find start of bad block")
