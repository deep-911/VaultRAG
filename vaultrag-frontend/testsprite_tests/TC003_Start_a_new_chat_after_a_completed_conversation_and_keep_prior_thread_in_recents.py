import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3001
        await page.goto("http://localhost:3001")
        
        # -> Type a short question into the chat input and submit it, wait for a response, then open the history sidebar.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[5]/main/div[2]/div/form/div/input[2]').nth(0)
        await asyncio.sleep(3); await elem.fill('What policies apply to my team this quarter?')
        
        # -> Open the history sidebar by clicking the 'Open sidebar' button (index 72).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Submit the question (ensure a response is produced), then open the history sidebar (if not already visible) and start a new chat from the sidebar to verify the main stage resets while the conversation remains in recent list.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[5]/header/div/div').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Submit the question again (ensure a response is produced), wait for the assistant response to render, then open the history sidebar (if not already open).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Submit the question again (press Enter), wait for a response to render, then open the history/sidebar and start a new chat to verify the main stage resets while the prior conversation remains in the recent list.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[5]/header/div/div').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # -> Click the suggested question to trigger a response, wait for the response to render, then open the history sidebar.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[5]/main/div/div[2]/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/button').nth(0)
        await asyncio.sleep(3); await elem.click()
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        assert await frame.locator("xpath=//*[contains(., 'Start a new chat') and contains(., 'What policies apply to my team this quarter?')]").nth(0).is_visible(), "The main chat should return to the welcome/empty state and the prior conversation should remain in the recent conversations list after starting a new chat."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    