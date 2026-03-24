from services.geospatial_service import GeospatialService
from services.hazard_service import HazardService

g = GeospatialService()
h = HazardService()
print("Services imported OK")

r = h.calculate_score(22.5, location="Mumbai")
print(f"Composite Score: {r['composite_score']}")
print(f"Severity: {r['severity']}")
print(f"Breakdown:")
for k, v in r['breakdown'].items():
    print(f"  {k}: {v['score']} (weight={v['weight']})")
