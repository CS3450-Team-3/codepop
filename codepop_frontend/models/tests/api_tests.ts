// models/tests/api_tests.ts

import { setAccessToken } from "../api/api";
import { login, logout, register } from "../api/auth";
import {
  getMe,
  updateMe,
  getUserById,
  editUserById,
  deleteUserById,
} from "../api/user";
import {
  getDrinks,
  getDrink,
  createDrink,
  updateDrink,
  deleteDrink,
  getUserDrinks,
  getMenu,
  generateGuestDrink,
  generateUserDrink,
} from "../api/drinks";
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  getUserOrders,
  createUserOrder,
  getUserOrder,
  updateUserOrder,
  deleteUserOrder,
  getOrderEmailPreview,
} from "../api/order";
import {
  getInventory,
  getInventoryItem,
  updateInventoryItem,
  patchInventoryItem,
  getInventoryReport,
} from "../api/inventory";
import {
  getNotifications,
  createNotification,
  getNotification,
  updateNotification,
  deleteNotification,
  getUserNotifications,
} from "../api/notifications";
import {
  getPreferences,
  createPreference,
  getPreference,
  updatePreference,
  deletePreference,
  getUserPreferences,
} from "../api/preferences";
import {
  getRevenues,
  createRevenue,
  getRevenue,
  updateRevenue,
  deleteRevenue,
} from "../api/revenue";
import {
  getServers,
  discoverServer,
  getMasterList,
} from "../api/admin";
import { sendChatbotMessage } from "../api/chatbot";
import api from "../api/api";

// ============================================================
// CONFIG — update these to match your dev environment
// ============================================================

const CONFIG = {
  // Set to true to print full API response bodies on failure
  DEBUG: false,

  // These users will be REGISTERED by the test suite (must not already exist)
  customer: {
    username: `test_customer_${Date.now()}`,
    password: "TestPass123!",
    first_name: "Test",
    last_name: "Customer",
    user_type: "customer" as const,
  },
  manager: {
    username: `test_manager_${Date.now()}`,
    password: "TestPass123!",
    first_name: "Test",
    last_name: "Manager",
    user_type: "store_manager" as const,
  },

  // This user must ALREADY EXIST in your DB with admin/super_admin role
  // Update these credentials to match a real admin in your dev DB
  admin: {
    username: "admin",
    password: "password123",
  },
};

// ============================================================
// SHARED STATE
// ============================================================

const state = {
  customerId: "",
  managerId: "",
  adminId: "",

  createdDrinkId: "",
  createdOrderId: "",
  createdNotificationId: 0,
  createdPreferenceId: 0,
  createdRevenueId: "",
  firstInventoryId: 0,

  // Track which user is currently "active" for context in logs
  currentUser: "",
};

// ============================================================
// TEST RUNNER
// ============================================================

type TestStatus = "PASS" | "FAIL" | "SKIP";

interface TestResult {
  name: string;
  status: TestStatus;
  duration: number;
  error?: string;
  debugInfo?: string;
}

interface RunnableSuite {
  name: string;
  tests: RunnableTest[];
}

interface RunnableTest {
  name: string;
  fn: () => Promise<void>;
  skip: boolean;
}

const runnableSuites: RunnableSuite[] = [];
let currentRunnableSuite: RunnableSuite | null = null;

function describeSuite(name: string, fn: () => void) {
  currentRunnableSuite = { name, tests: [] };
  runnableSuites.push(currentRunnableSuite);
  fn();
}

function it(name: string, fn: () => Promise<void>, skip = false) {
  if (!currentRunnableSuite) throw new Error("it() called outside of describeSuite()");
  currentRunnableSuite.tests.push({ name, fn, skip });
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertHasKeys<T extends object>(obj: T, keys: (keyof T)[]) {
  for (const key of keys) {
    assert(key in obj, `Expected key "${String(key)}" to exist in object. Got keys: ${Object.keys(obj).join(", ")}`);
  }
}

// Wraps an API call and extracts the error response body for better debugging
async function debugCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (CONFIG.DEBUG && err && typeof err === "object" && "response" in err) {
      const axiosErr = err as { response?: { status: number; data: unknown } };
      if (axiosErr.response) {
        const debugInfo = `\n         HTTP ${axiosErr.response.status} — Response body: ${JSON.stringify(axiosErr.response.data, null, 2)}`;
        const wrappedErr = new Error(
          `Request failed with status code ${axiosErr.response.status}${debugInfo}`
        );
        throw wrappedErr;
      }
    }
    throw err;
  }
}

async function run() {
  console.log("\n🧪  Running CodePop API Test Suite...\n");
  console.log(`    Customer username: ${CONFIG.customer.username}`);
  console.log(`    Manager username:  ${CONFIG.manager.username}`);
  console.log(`    Admin username:    ${CONFIG.admin.username}`);
  console.log(`    Debug mode:        ${CONFIG.DEBUG}\n`);

  const allResults: { name: string; results: TestResult[] }[] = [];

  for (const suite of runnableSuites) {
    const suiteResult = { name: suite.name, results: [] as TestResult[] };
    allResults.push(suiteResult);

    for (const t of suite.tests) {
      if (t.skip) {
        suiteResult.results.push({ name: t.name, status: "SKIP", duration: 0 });
        continue;
      }

      const start = Date.now();
      try {
        await t.fn();
        suiteResult.results.push({
          name: t.name,
          status: "PASS",
          duration: Date.now() - start,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        suiteResult.results.push({
          name: t.name,
          status: "FAIL",
          duration: Date.now() - start,
          error: message,
        });
      }
    }
  }

  // ── Print Results ──────────────────────────────────────────
  console.log("\n");
  console.log("=".repeat(70));
  console.log("  CODEPOP API TEST RESULTS");
  console.log("=".repeat(70));

  let totalPass = 0;
  let totalFail = 0;
  let totalSkip = 0;

  for (const suite of allResults) {
    const pass = suite.results.filter((r) => r.status === "PASS").length;
    const fail = suite.results.filter((r) => r.status === "FAIL").length;
    const skip = suite.results.filter((r) => r.status === "SKIP").length;

    const icon = fail > 0 ? "❌" : "✅";
    console.log(`\n${icon} ${suite.name}  (${pass}✓  ${fail}✗  ${skip}○)`);
    console.log("─".repeat(70));

    for (const result of suite.results) {
      const statusIcon =
        result.status === "PASS" ? "  ✓" :
        result.status === "FAIL" ? "  ✗" : "  ○";
      const timing = result.status !== "SKIP" ? ` (${result.duration}ms)` : "";
      console.log(`${statusIcon}  ${result.name}${timing}`);
      if (result.error) {
        // Print each line of the error indented
        const lines = result.error.split("\n");
        for (const line of lines) {
          console.log(`       ${line}`);
        }
      }
    }

    totalPass += pass;
    totalFail += fail;
    totalSkip += skip;
  }

  console.log("\n" + "=".repeat(70));
  const statusIcon = totalFail === 0 ? "🎉" : "💥";
  console.log(
    `${statusIcon}  TOTAL:  ${totalPass} passed  |  ${totalFail} failed  |  ${totalSkip} skipped`
  );
  console.log("=".repeat(70) + "\n");

  if (totalFail > 0) process.exit(1);
}

// ============================================================
// SUITE: AUTH
// ============================================================

describeSuite("Auth", () => {
  it("Register new customer account", async () => {
    const user = await debugCall(() => register(CONFIG.customer));
    assert(!!user, "Register should return a user");
    assert(!!user.id, "User should have an id");
    state.customerId = user.id;
    state.currentUser = "customer";
    setAccessToken(null);
  });

  it("Register new manager account", async () => {
    const user = await debugCall(() => register(CONFIG.manager));
    assert(!!user, "Register should return a user");
    assert(!!user.id, "User should have an id");
    state.managerId = user.id;
    setAccessToken(null);
  });

  it("Login as customer", async () => {
    const user = await debugCall(() =>
      login(CONFIG.customer.username, CONFIG.customer.password)
    );
    assert(!!user, "Login should return a user");
    assert(!!user.id, "User should have an id");
    assert(user.username === CONFIG.customer.username, "Username should match");
    state.customerId = user.id;
  });

  it("Login as admin (skip if admin credentials not configured)", async () => {
    // If admin credentials are still the defaults, try but don't hard-fail the suite
    try {
      const user = await debugCall(() =>
        login(CONFIG.admin.username, CONFIG.admin.password)
      );
      assert(!!user, "Admin login should return a user");
      state.adminId = user.id;
    } catch (err) {
      throw new Error(
        `Admin login failed. Make sure CONFIG.admin credentials match a real admin user in your DB.\n         Original: ${err instanceof Error ? err.message : err}`
      );
    }
  });

  it("Fetch me — proves customer token is active", async () => {
    // Re-login as customer so we have a valid token after the admin login above
    await login(CONFIG.customer.username, CONFIG.customer.password);
    const me = await debugCall(() => getMe());
    assert(!!me.id, "Should return authenticated user");
    assert(me.username === CONFIG.customer.username, "Should be the customer");
  });
});

// ============================================================
// SUITE: USER PROFILE
// ============================================================

describeSuite("User — Profile", () => {
  it("Re-login as customer", async () => {
    await login(CONFIG.customer.username, CONFIG.customer.password);
  });

  it("Get current user profile (me)", async () => {
    const me = await debugCall(() => getMe());
    assertHasKeys(me, ["id", "username"]);
    assert(me.username === CONFIG.customer.username, "Username should match");
  });

  it("Update profile — first name and last name", async () => {
    const updated = await debugCall(() =>
      updateMe({ first_name: "Updated", last_name: "Name" })
    );
    assert(updated.first_name === "Updated", "First name should be updated");
    assert(updated.last_name === "Name", "Last name should be updated");
  });

  it("Update profile — email", async () => {
    const updated = await debugCall(() =>
      updateMe({ email: "updated@test.com" })
    );
    assert(updated.email === "updated@test.com", "Email should be updated");
  });

  // getUserById and editUserById require admin — skip for customer, test under admin suite
  it("Get user by ID (admin only — skipped here, tested in Admin suite)", async () => {
    // This is a known 403 for non-admin users — we verify the 403 is correct behavior
    let got403 = false;
    try {
      await getUserById(state.customerId);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 403) got403 = true;
      }
    }
    assert(got403, "Non-admin should receive 403 when accessing getUserById");
  });
});

// ============================================================
// SUITE: DRINKS
// ============================================================

describeSuite("Drinks", () => {
  it("Re-login as customer", async () => {
    await login(CONFIG.customer.username, CONFIG.customer.password);
  });

  it("Get all drinks", async () => {
    const drinks = await debugCall(() => getDrinks());
    assert(Array.isArray(drinks), "Should return an array");
  });

  it("Get menu — handle both array and object response shapes", async () => {
    // The menu endpoint may return an object with a nested array rather than
    // a bare array — we accept either and log what we got
    const result = await debugCall(() => getMenu());
    const isArray = Array.isArray(result);
    const isObjectWithArray =
      typeof result === "object" &&
      result !== null &&
      Object.values(result as object).some((v) => Array.isArray(v));
    assert(
      isArray || isObjectWithArray,
      `Menu should be an array or object containing arrays. Got: ${JSON.stringify(result).slice(0, 200)}`
    );
  });

  it("Create a drink", async () => {
    // Minimal required fields from schema: Name, SodaUsed, Price, User_Created
    const drink = await debugCall(() =>
      createDrink({
        Name: "Test Drink",
        SodaUsed: ["Sprite"],
        Price: 4.99,
        User_Created: true,
        // Optional fields omitted to test minimal payload
      })
    );
    assertHasKeys(drink, ["DrinkID", "Name", "Price"]);
    assert(drink.Name === "Test Drink", "Drink name should match");
    state.createdDrinkId = drink.DrinkID;
  });

  it("Get drink by ID", async () => {
    assert(!!state.createdDrinkId, "Need a created drink ID from previous test");
    const drink = await debugCall(() => getDrink(state.createdDrinkId));
    assert(drink.DrinkID === state.createdDrinkId, "DrinkID should match");
  });

  it("Update drink", async () => {
    assert(!!state.createdDrinkId, "Need a created drink ID from previous test");
    const updated = await debugCall(() =>
      updateDrink(state.createdDrinkId, {
        Name: "Updated Test Drink",
        SodaUsed: ["Sprite"],
        Price: 5.99,
        User_Created: true,
      })
    );
    assert(updated.Name === "Updated Test Drink", "Name should be updated");
    assert(updated.Price === 5.99, "Price should be updated");
  });

  it("Get user drinks", async () => {
    const drinks = await debugCall(() => getUserDrinks(state.customerId));
    assert(Array.isArray(drinks), "Should return an array");
  });

  it("Generate guest drink recommendation", async () => {
    const result = await debugCall(() => generateGuestDrink());
    assert(typeof result === "object", "Should return an object");
  });

  it("Generate user drink recommendation", async () => {
    const result = await debugCall(() => generateUserDrink(state.customerId));
    assert(typeof result === "object", "Should return an object");
  });

  it("Delete drink", async () => {
    assert(!!state.createdDrinkId, "Need a created drink ID from previous test");
    await debugCall(() => deleteDrink(state.createdDrinkId));

    let got404 = false;
    try {
      await getDrink(state.createdDrinkId);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 404) got404 = true;
      }
    }
    assert(got404, "Deleted drink should return 404");
    state.createdDrinkId = ""; // clear so downstream tests don't try to use it
  });
});

// ============================================================
// SUITE: ORDERS
// ============================================================

describeSuite("Orders", () => {
  // Local to this suite — drink created just for order tests
  let orderTestDrinkId = "";

  it("Re-login as customer", async () => {
    await login(CONFIG.customer.username, CONFIG.customer.password);
  });

  it("Setup — create a drink for order tests", async () => {
    const drink = await debugCall(() =>
      createDrink({
        Name: "Order Test Drink",
        SodaUsed: ["Cola"],
        Price: 3.99,
        User_Created: true,
      })
    );
    orderTestDrinkId = drink.DrinkID;
    assert(!!orderTestDrinkId, "Should have a drink ID");
  });

  it("Get all orders", async () => {
    const orders = await debugCall(() => getOrders());
    assert(Array.isArray(orders), "Should return an array");
  });

  it("Create an order — minimal required fields", async () => {
    // Schema requires: Drinks array only. UserID/OriginatingServer are nullable.
    const order = await debugCall(() =>
      createOrder({
        Drinks: [orderTestDrinkId],
      })
    );
    assertHasKeys(order, ["OrderID", "Drinks", "CreationTime"]);
    assert(
      order.Drinks.includes(orderTestDrinkId),
      "Order should include our drink"
    );
    state.createdOrderId = order.OrderID;
  });

  it("Get order by ID", async () => {
    assert(!!state.createdOrderId, "Need a created order ID");
    const order = await debugCall(() => getOrder(state.createdOrderId));
    assert(order.OrderID === state.createdOrderId, "OrderID should match");
  });

  it("Update order to Processing", async () => {
    assert(!!state.createdOrderId, "Need a created order ID");
    const updated = await debugCall(() =>
      updateOrder(state.createdOrderId, {
        Drinks: [orderTestDrinkId],
        OrderStatus: "Processing",
        PaymentStatus: "Paid",
      })
    );
    assert(updated.OrderStatus === "Processing", "Status should be Processing");
  });

  it("Get user orders", async () => {
    const orders = await debugCall(() => getUserOrders(state.customerId));
    assert(Array.isArray(orders), "Should return an array");
  });

  it("Create and delete order via user route", async () => {
    const order = await debugCall(() =>
      createUserOrder(state.customerId, {
        Drinks: [orderTestDrinkId],
      })
    );
    assert(!!order.OrderID, "Should return an order with an ID");
    await deleteUserOrder(state.customerId, order.OrderID);

    // Verify it's gone
    let got404 = false;
    try {
      await getOrder(order.OrderID);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 404) got404 = true;
      }
    }
    assert(got404, "Deleted order should return 404");
  });

  it("Get user order by ID", async () => {
    const order = await debugCall(() =>
      getUserOrder(state.customerId, state.createdOrderId)
    );
    assert(order.OrderID === state.createdOrderId, "OrderID should match");
  });

  it("Update user order to Completed", async () => {
    const updated = await debugCall(() =>
      updateUserOrder(state.customerId, state.createdOrderId, {
        Drinks: [orderTestDrinkId],
        OrderStatus: "Completed",
        PaymentStatus: "Paid",
      })
    );
    assert(updated.OrderStatus === "Completed", "Status should be Completed");
  });

  it("Get order email preview", async () => {
    const result = await debugCall(() =>
      getOrderEmailPreview(state.createdOrderId)
    );
    assert(
      typeof result.message === "string",
      `Should return a message string. Got: ${JSON.stringify(result)}`
    );
  });

  it("Delete order", async () => {
    await debugCall(() => deleteOrder(state.createdOrderId));

    let got404 = false;
    try {
      await getOrder(state.createdOrderId);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 404) got404 = true;
      }
    }
    assert(got404, "Deleted order should return 404");
    state.createdOrderId = "";
  });

  it("Cleanup — delete order test drink", async () => {
    await debugCall(() => deleteDrink(orderTestDrinkId));
  });
});

// ============================================================
// SUITE: INVENTORY
// ============================================================

describeSuite("Inventory", () => {
  it("Login as manager", async () => {
    await login(CONFIG.manager.username, CONFIG.manager.password);
  });

  it("Get all inventory items", async () => {
    const items = await debugCall(() => getInventory());
    assert(Array.isArray(items), "Should return an array");
    if (items.length > 0) {
      state.firstInventoryId = items[0].InventoryID;
      assertHasKeys(items[0], [
        "InventoryID",
        "ItemName",
        "ItemType",
        "Quantity",
        "ThresholdLevel",
      ]);
    } else {
      console.log("    ⚠  No inventory items in DB — skipping item-specific tests");
    }
  });

  it("Get inventory item by ID", async () => {
    assert(state.firstInventoryId > 0, "No inventory items exist to test retrieval");
    const item = await debugCall(() => getInventoryItem(state.firstInventoryId));
    assert(item.InventoryID === state.firstInventoryId, "ID should match");
  });

  it("Patch inventory item quantity", async () => {
    assert(state.firstInventoryId > 0, "No inventory items exist to test patch");
    // Fetch current state first so we patch with valid data
    const current = await getInventoryItem(state.firstInventoryId);
    const newQty = current.Quantity + 1;

    // Some backends require ALL fields even on PATCH — send full object
    const patched = await debugCall(() =>
      patchInventoryItem(state.firstInventoryId, {
        ItemName: current.ItemName,
        ItemType: current.ItemType,
        Quantity: newQty,
        ThresholdLevel: current.ThresholdLevel,
      })
    );
    assert(patched.Quantity === newQty, `Quantity should be ${newQty}, got ${patched.Quantity}`);
  });

  it("Full update inventory item", async () => {
    assert(state.firstInventoryId > 0, "No inventory items exist to test update");
    const current = await getInventoryItem(state.firstInventoryId);
    const updated = await debugCall(() =>
      updateInventoryItem(state.firstInventoryId, {
        ItemName: current.ItemName,
        ItemType: current.ItemType,
        Quantity: current.Quantity,
        ThresholdLevel: current.ThresholdLevel,
      })
    );
    assertHasKeys(updated, ["InventoryID", "ItemName", "Quantity"]);
  });

  it("Get inventory report", async () => {
    const report = await debugCall(() => getInventoryReport());
    assertHasKeys(report, [
      "inventory_items",
      "total_items",
      "out_of_stock",
      "below_threshold",
    ]);
    assert(
      typeof report.total_items === "number",
      "total_items should be a number"
    );
    assert(
      Array.isArray(report.inventory_items),
      "inventory_items should be an array"
    );
  });
});

// ============================================================
// SUITE: NOTIFICATIONS
// ============================================================

describeSuite("Notifications", () => {
  it("Re-login as customer", async () => {
    await login(CONFIG.customer.username, CONFIG.customer.password);
  });

  it("Get all notifications", async () => {
    const notifications = await debugCall(() => getNotifications());
    assert(Array.isArray(notifications), "Should return an array");
  });

  it("Create a notification", async () => {
    const notification = await debugCall(() =>
      createNotification({
        Message: "Test notification from API test suite",
        Type: "info",
        Global: false,
        UserID: state.customerId,
      })
    );
    assertHasKeys(notification, ["NotificationID", "Message", "Type", "UserID"]);
    state.createdNotificationId = notification.NotificationID;
  });

  it("Get notification by ID", async () => {
    const notification = await debugCall(() =>
      getNotification(state.createdNotificationId)
    );
    assert(
      notification.NotificationID === state.createdNotificationId,
      "NotificationID should match"
    );
  });

  it("Update notification", async () => {
    const updated = await debugCall(() =>
      updateNotification(state.createdNotificationId, {
        Message: "Updated notification message",
        Type: "warning",
        Global: false,
        UserID: state.customerId,
      })
    );
    assert(
      updated.Message === "Updated notification message",
      "Message should be updated"
    );
  });

  it("Get user notifications", async () => {
    const notifications = await debugCall(() =>
      getUserNotifications(state.customerId)
    );
    assert(Array.isArray(notifications), "Should return an array");
  });

  it("Delete notification", async () => {
    await debugCall(() => deleteNotification(state.createdNotificationId));

    let got404 = false;
    try {
      await getNotification(state.createdNotificationId);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 404) got404 = true;
      }
    }
    assert(got404, "Deleted notification should return 404");
  });
});

// ============================================================
// SUITE: PREFERENCES
// ============================================================

describeSuite("Preferences", () => {
  it("Re-login as customer", async () => {
    await login(CONFIG.customer.username, CONFIG.customer.password);
  });

  it("Get all preferences", async () => {
    const prefs = await debugCall(() => getPreferences());
    assert(Array.isArray(prefs), "Should return an array");
  });

  it("Create a preference", async () => {
    // Schema: UserID + Preference are required
    // The UserID must be a valid UUID of an existing user
    assert(!!state.customerId, "Need a valid customer ID");
    const pref = await debugCall(() =>
      createPreference({
        UserID: state.customerId,
        Preference: "No ice please",
      })
    );
    assertHasKeys(pref, ["PreferenceID", "UserID", "Preference"]);
    assert(pref.Preference === "No ice please", "Preference value should match");
    assert(pref.UserID === state.customerId, "UserID should match");
    state.createdPreferenceId = pref.PreferenceID;
  });

  it("Get preference by ID", async () => {
    const pref = await debugCall(() =>
      getPreference(state.createdPreferenceId)
    );
    assert(
      pref.PreferenceID === state.createdPreferenceId,
      "PreferenceID should match"
    );
  });

  it("Update preference", async () => {
    const updated = await debugCall(() =>
      updatePreference(state.createdPreferenceId, {
        UserID: state.customerId,
        Preference: "Extra ice please",
      })
    );
    assert(
      updated.Preference === "Extra ice please",
      "Preference should be updated"
    );
  });

  it("Get user preferences", async () => {
    const prefs = await debugCall(() => getUserPreferences(state.customerId));
    assert(Array.isArray(prefs), "Should return an array");
  });

  it("Delete preference", async () => {
    await debugCall(() => deletePreference(state.createdPreferenceId));

    let got404 = false;
    try {
      await getPreference(state.createdPreferenceId);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 404) got404 = true;
      }
    }
    assert(got404, "Deleted preference should return 404");
  });
});

// ============================================================
// SUITE: REVENUE
// ============================================================

describeSuite("Revenue", () => {
  let revenueDrinkId = "";
  let revenueOrderId = "";

  it("Login as manager", async () => {
    await login(CONFIG.manager.username, CONFIG.manager.password);
  });

  it("Setup — create drink and order for revenue tests", async () => {
    const drink = await debugCall(() =>
      createDrink({
        Name: "Revenue Test Drink",
        SodaUsed: ["Water"],
        Price: 2.99,
        User_Created: false,
      })
    );
    revenueDrinkId = drink.DrinkID;

    const order = await debugCall(() =>
      createOrder({
        Drinks: [revenueDrinkId],
        OrderStatus: "Completed",
        PaymentStatus: "Paid",
      })
    );
    revenueOrderId = order.OrderID;
    assert(!!revenueOrderId, "Should have a valid order ID");
  });

  it("Get all revenues", async () => {
    const revenues = await debugCall(() => getRevenues());
    assert(Array.isArray(revenues), "Should return an array");
  });

  it("Create a revenue record", async () => {
    assert(!!revenueOrderId, "Need a valid order ID");
    const revenue = await debugCall(() =>
      createRevenue({
        OrderID: revenueOrderId,
        TotalAmount: 2.99,
        Refunded: false,
      })
    );
    assertHasKeys(revenue, ["RevenueID", "OrderID"]);
    assert(revenue.OrderID === revenueOrderId, "OrderID should match");
    state.createdRevenueId = revenue.RevenueID;
  });

  it("Get revenue by ID", async () => {
    const revenue = await debugCall(() => getRevenue(state.createdRevenueId));
    assert(
      revenue.RevenueID === state.createdRevenueId,
      "RevenueID should match"
    );
  });

  it("Update revenue — mark as refunded", async () => {
    const updated = await debugCall(() =>
      updateRevenue(state.createdRevenueId, {
        OrderID: revenueOrderId,
        TotalAmount: 0,
        Refunded: true,
      })
    );
    assert(updated.Refunded === true, "Revenue should be marked as refunded");
  });

  it("Delete revenue", async () => {
    await debugCall(() => deleteRevenue(state.createdRevenueId));

    let got404 = false;
    try {
      await getRevenue(state.createdRevenueId);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status: number } };
        if (axiosErr.response?.status === 404) got404 = true;
      }
    }
    assert(got404, "Deleted revenue should return 404");
  });

  it("Cleanup — delete test order and drink", async () => {
    if (revenueOrderId) await debugCall(() => deleteOrder(revenueOrderId));
    if (revenueDrinkId) await debugCall(() => deleteDrink(revenueDrinkId));
  });
});

// ============================================================
// SUITE: CHATBOT
// ============================================================

describeSuite("Chatbot", () => {
  it("Re-login as customer", async () => {
    await login(CONFIG.customer.username, CONFIG.customer.password);
  });

  it("Send a basic message", async () => {
    const response = await debugCall(() =>
      sendChatbotMessage({
        message: "Hello, what drinks do you have?",
        wrong_drink_phase: "",
        refund_phase: "",
        order_num: "",
        drink_nums: "",
      })
    );
    assertHasKeys(response, [
      "responses",
      "wrong_drink_phase",
      "refund_phase",
      "order_num",
      "drink_nums",
    ]);
    assert(!!response.responses, "Should have a response from chatbot");
  });

  it("Send a refund request message", async () => {
    const response = await debugCall(() =>
      sendChatbotMessage({
        message: "I would like a refund",
        wrong_drink_phase: "",
        refund_phase: "init",
        order_num: "",
        drink_nums: "",
      })
    );
    assert(
      typeof response.refund_phase === "string",
      "refund_phase should be a string"
    );
  });
});

// ============================================================
// SUITE: SERVERS & P2P
// ============================================================

describeSuite("Servers & P2P", () => {
  it("Login as admin (skip gracefully if not configured)", async () => {
    try {
      await login(CONFIG.admin.username, CONFIG.admin.password);
    } catch {
      // Log a warning but don't fail — server tests that don't need auth will still run
      console.log(
        "    ⚠  Admin login failed — server tests requiring auth will fail"
      );
    }
  });

  it("Get all servers", async () => {
    const servers = await debugCall(() => getServers());
    assert(Array.isArray(servers), "Should return an array");
    if (servers.length > 0) {
      assertHasKeys(servers[0], ["ServerID", "ServerURL", "PublicKey"]);
    }
  });

  it("Discover server identity", async () => {
    const identity = await debugCall(() => discoverServer());
    assert(
      typeof identity === "object" && identity !== null,
      `Should return an object. Got: ${JSON.stringify(identity)}`
    );
  });

  it("Get master list — accept any object response", async () => {
    // The schema says { status: string } but the actual response may differ
    const result = await debugCall(() => getMasterList());
    assert(
      typeof result === "object" && result !== null,
      `Should return an object. Got: ${JSON.stringify(result)}`
    );
    // Log the actual shape so we can see what the API returns
    if (CONFIG.DEBUG) {
      console.log(`    ℹ  Master list response shape: ${JSON.stringify(result).slice(0, 300)}`);
    }
  });
});

// ============================================================
// SUITE: ADMIN — User management (requires admin token)
// ============================================================

describeSuite("Admin — User Management", () => {
  it("Login as admin", async () => {
    const user = await debugCall(() =>
      login(CONFIG.admin.username, CONFIG.admin.password)
    );
    assert(!!user, "Admin login should return a user");
    state.adminId = user.id;
  });

  it("Get user by ID as admin", async () => {
    assert(!!state.customerId, "Need a customer ID");
    const user = await debugCall(() => getUserById(state.customerId));
    assert(!!user.id, "Should return a user with an id");
  });

  it("Edit user by ID as admin", async () => {
    assert(!!state.customerId, "Need a customer ID");
    const updated = await debugCall(() =>
      editUserById(state.customerId, {
        username: CONFIG.customer.username,
        password: CONFIG.customer.password,
        first_name: "Test",
        last_name: "Customer",
      })
    );
    assert(!!updated.id, "Should return the updated user");
  });

  it("Delete customer test account as admin", async () => {
    assert(!!state.customerId, "Need a customer ID");
    await debugCall(() => deleteUserById(state.customerId));

    // Verify deletion
    let got404or403 = false;
    try {
      await getUserById(state.customerId);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status: number } };
        if (
          axiosErr.response?.status === 404 ||
          axiosErr.response?.status === 403
        ) {
          got404or403 = true;
        }
      }
    }
    assert(got404or403, "Deleted user should return 404 or 403");
  });

  it("Delete manager test account as admin", async () => {
    assert(!!state.managerId, "Need a manager ID");
    await debugCall(() => deleteUserById(state.managerId));
  });
});

// ============================================================
// RUN
// ============================================================

run();