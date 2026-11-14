import asyncio
import os
from playwright.async_api import async_playwright
from PIL import Image

async def main():
    svg_path = os.path.abspath('public/favicon-us.svg').replace('\\', '/')
    html_content = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body {{
    margin: 0;
    padding: 0;
    width: 512px;
    height: 512px;
    overflow: hidden;
    background: transparent;
  }}
  img {{
    width: 512px;
    height: 512px;
    display: block;
  }}
</style>
</head>
<body>
  <img src="file:///{svg_path}" />
</body>
</html>'''

    temp_html = os.path.abspath('temp_icon_render.html')
    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(html_content)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 512, 'height': 512}, device_scale_factor=1)
        await page.goto(f'file:///{temp_html.replace("\\", "/")}')
        await page.wait_for_timeout(500)
        await page.screenshot(path='public/app-icon-us.png', omit_background=True)
        await page.screenshot(path='public/icon-us.png', omit_background=True)
        await browser.close()

    if os.path.exists(temp_html):
        os.remove(temp_html)

    # Convert to multi-resolution ICO for Windows executable
    img = Image.open('public/icon-us.png')
    img.save(
        'public/icon-us.ico',
        format='ICO',
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
    )
    print('SUCCESS: Created public/app-icon-us.png, public/icon-us.png, public/icon-us.ico')

if __name__ == '__main__':
    asyncio.run(main())
