"""
AI Image Enhancement Engine
Uses Pillow for: sharpen, denoise, upscale, background blur, HDR, color enhance, smooth skin, vignette
"""
import sys, json, os
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw

def enhance_image(input_path, output_path, filters):
    img = Image.open(input_path).convert("RGB")
    original_size = img.size

    for f in filters:
        name = f.get("name", "")
        strength = float(f.get("strength", 1.0))

        if name == "upscale":
            factor = max(1, min(int(strength), 4))
            new_w = img.width * factor
            new_h = img.height * factor
            img = img.resize((new_w, new_h), Image.LANCZOS)

        elif name == "sharpen":
            for _ in range(max(1, int(strength * 2))):
                img = img.filter(ImageFilter.SHARPEN)

        elif name == "denoise":
            radius = max(1, int(strength * 2))
            img = img.filter(ImageFilter.MedianFilter(size=radius * 2 + 1 if radius * 2 + 1 <= 5 else 5))

        elif name == "hdr":
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.0 + strength * 0.5)
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(1.0 + strength * 0.3)
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(1.0 + strength * 0.1)

        elif name == "color_enhance":
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(1.0 + strength * 0.8)

        elif name == "brightness":
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(1.0 + (strength - 0.5) * 0.6)

        elif name == "contrast":
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.0 + (strength - 0.5) * 0.8)

        elif name == "smooth_skin":
            blurred = img.filter(ImageFilter.GaussianBlur(radius=max(1, int(strength * 3))))
            img = Image.blend(img, blurred, alpha=min(0.5, strength * 0.3))
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(1.0 + strength * 0.3)

        elif name == "background_blur":
            blur_radius = max(3, int(strength * 12))
            blurred = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
            # Create oval center mask to keep subject sharp
            mask = Image.new("L", img.size, 0)
            draw = ImageDraw.Draw(mask)
            cx, cy = img.width // 2, img.height // 2
            rx, ry = int(img.width * 0.3), int(img.height * 0.4)
            draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(radius=blur_radius // 2))
            img = Image.composite(img, blurred, mask)

        elif name == "vignette":
            vignette = Image.new("RGB", img.size, (0, 0, 0))
            mask = Image.new("L", img.size, 0)
            draw = ImageDraw.Draw(mask)
            cx, cy = img.width // 2, img.height // 2
            max_dim = max(img.width, img.height)
            radius = int(max_dim * (1.2 - strength * 0.3))
            draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(radius=max_dim // 4))
            img = Image.composite(img, vignette, mask)

        elif name == "warm":
            r, g, b = img.split()
            r = r.point(lambda x: min(255, int(x * (1.0 + strength * 0.08))))
            b = b.point(lambda x: max(0, int(x * (1.0 - strength * 0.08))))
            img = Image.merge("RGB", (r, g, b))

        elif name == "cool":
            r, g, b = img.split()
            b = b.point(lambda x: min(255, int(x * (1.0 + strength * 0.08))))
            r = r.point(lambda x: max(0, int(x * (1.0 - strength * 0.05))))
            img = Image.merge("RGB", (r, g, b))

        elif name == "bw":
            from PIL import ImageOps
            img = ImageOps.grayscale(img).convert("RGB")

        elif name == "vintage":
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(0.6)
            r, g, b = img.split()
            r = r.point(lambda x: min(255, int(x * 1.1)))
            g = g.point(lambda x: int(x * 0.95))
            b = b.point(lambda x: int(x * 0.8))
            img = Image.merge("RGB", (r, g, b))
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(0.9)

    img.save(output_path, "JPEG", quality=95)
    return {"width": img.width, "height": img.height, "original_width": original_size[0], "original_height": original_size[1]}


if __name__ == "__main__":
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    filters = json.loads(sys.argv[3])
    result = enhance_image(input_path, output_path, filters)
    print(json.dumps(result))
