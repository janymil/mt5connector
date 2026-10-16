//+------------------------------------------------------------------+
//|                                        AccountStatsConnector.mq5 |
//|                                  Copyright 2026, Antigravity AI  |
//|                                             https://github.com/  |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Antigravity AI"
#property link      "https://github.com/"
#property version   "1.01"
#property description "Syncs MT5 trading history (including comments and magic numbers)"
#property description "to a private Web Dashboard."

//--- Inputs
input string   InpApiKey               = "";                                         // Dashboard API Key (Required)
input string   InpServerURL            = "https://mt5connector.uk/api/sync"; // Server URL
input int      InpSyncIntervalMinutes  = 30;                                         // Sync interval in minutes
input bool     InpSyncOnStartup        = true;                                       // Run sync immediately on startup

//--- Global Variables
datetime       g_last_sync_time        = 0;
int            g_sync_timer_seconds    = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("AccountStatsConnector: Initializing...");
   
   if(StringLen(InpApiKey) == 0)
   {
      Alert("AccountStatsConnector Error: API Key is missing. Please copy it from your Dashboard.");
      return(INIT_FAILED);
   }
   
   // Check if WebRequest is enabled for the URL
   char post_data[], result_data[];
   string result_headers;
   string check_url = InpServerURL;
   
   // A dummy WebRequest call to check permissions in MT5
   ResetLastError();
   int res = WebRequest("GET", check_url, NULL, NULL, 500, post_data, 0, result_data, result_headers);
   if(res == -1 && GetLastError() == 4014)
   {
      Alert("AccountStatsConnector Error: WebRequest is not allowed for URL '", check_url, "'. Please add it in Tools -> Options -> Expert Advisors.");
      return(INIT_FAILED);
   }

   g_sync_timer_seconds = InpSyncIntervalMinutes * 60;
   if(g_sync_timer_seconds < 10) g_sync_timer_seconds = 10; // Minimum 10 seconds safety limit
   
   EventSetTimer(g_sync_timer_seconds);
   
   if(InpSyncOnStartup)
   {
      SyncStatistics();
   }
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("AccountStatsConnector: Deinitialized.");
}

//+------------------------------------------------------------------+
//| Expert tick function (or timer function)                         |
//+------------------------------------------------------------------+
void OnTimer()
{
   SyncStatistics();
}

//+------------------------------------------------------------------+
//| Main Sync Function                                               |
//+------------------------------------------------------------------+
void SyncStatistics()
{
   Print("AccountStatsConnector: Starting trade history sync...");
   
   // Select whole history from the beginning
   if(!HistorySelect(0, TimeCurrent()))
   {
      Print("AccountStatsConnector Error: Failed to select history. Error code: ", GetLastError());
      return;
   }
   
   int total_deals = HistoryDealsTotal();
   Print("AccountStatsConnector: Found ", total_deals, " total deals in history.");
   
   // 1. Build Account Metadata JSON
   string account_id = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string name       = EscapeJsonString(AccountInfoString(ACCOUNT_NAME));
   string broker     = EscapeJsonString(AccountInfoString(ACCOUNT_COMPANY));
   string currency   = EscapeJsonString(AccountInfoString(ACCOUNT_CURRENCY));
   long leverage     = AccountInfoInteger(ACCOUNT_LEVERAGE);
   double balance    = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity     = AccountInfoDouble(ACCOUNT_EQUITY);
   
   long trade_mode_int = AccountInfoInteger(ACCOUNT_TRADE_MODE);
   string trade_mode = "Live";
   if (trade_mode_int == ACCOUNT_TRADE_MODE_DEMO || trade_mode_int == ACCOUNT_TRADE_MODE_CONTEST) {
      trade_mode = "Demo";
   }
   
   string json = "{\n";
   json += "  \"account\": {\n";
   json += "    \"account_id\": \"" + account_id + "\",\n";
   json += "    \"name\": \"" + name + "\",\n";
   json += "    \"broker\": \"" + broker + "\",\n";
   json += "    \"currency\": \"" + currency + "\",\n";
   json += "    \"leverage\": " + IntegerToString(leverage) + ",\n";
   json += "    \"balance\": " + DoubleToString(balance, 2) + ",\n";
   json += "    \"equity\": " + DoubleToString(equity, 2) + ",\n";
   json += "    \"trade_mode\": \"" + trade_mode + "\"\n";
   json += "  },\n";
   
   // 2. Build Deals JSON Array
   json += "  \"deals\": [\n";
   
   int added_count = 0;
   for(int i = 0; i < total_deals; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket <= 0) continue;
      
      long order_ticket = HistoryDealGetInteger(ticket, DEAL_ORDER);
      long time         = HistoryDealGetInteger(ticket, DEAL_TIME);
      long type         = HistoryDealGetInteger(ticket, DEAL_TYPE);
      long entry        = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      long magic        = HistoryDealGetInteger(ticket, DEAL_MAGIC);
      double profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
      double volume     = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price      = HistoryDealGetDouble(ticket, DEAL_PRICE);
      string symbol     = EscapeJsonString(HistoryDealGetString(ticket, DEAL_SYMBOL));
      string comment    = EscapeJsonString(HistoryDealGetString(ticket, DEAL_COMMENT));
      long position_id  = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
      
      // Format one deal
      string deal_json = "    {\n";
      deal_json += "      \"ticket\": \"" + IntegerToString(ticket) + "\",\n";
      deal_json += "      \"order_ticket\": \"" + IntegerToString(order_ticket) + "\",\n";
      deal_json += "      \"position_id\": \"" + IntegerToString(position_id) + "\",\n";
      deal_json += "      \"time\": " + IntegerToString(time) + ",\n";
      deal_json += "      \"type\": " + IntegerToString(type) + ",\n";
      deal_json += "      \"entry\": " + IntegerToString(entry) + ",\n";
      deal_json += "      \"magic\": " + IntegerToString(magic) + ",\n";
      deal_json += "      \"profit\": " + DoubleToString(profit, 2) + ",\n";
      deal_json += "      \"commission\": " + DoubleToString(commission, 2) + ",\n";
      deal_json += "      \"swap\": " + DoubleToString(swap, 2) + ",\n";
      deal_json += "      \"volume\": " + DoubleToString(volume, 4) + ",\n";
      deal_json += "      \"price\": " + DoubleToString(price, 5) + ",\n";
      deal_json += "      \"symbol\": \"" + symbol + "\",\n";
      deal_json += "      \"comment\": \"" + comment + "\"\n";
      deal_json += "    }";
      
      if(added_count > 0)
      {
         json = json + ",\n" + deal_json;
      }
      else
      {
         json = json + deal_json;
      }
      added_count++;
   }
   
   json += "\n  ],\n";
   
   // 3. Build Positions JSON Array
   json += "  \"positions\": [\n";
   
   int added_pos_count = 0;
   int total_positions = PositionsTotal();
   for(int i = 0; i < total_positions; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket <= 0) continue;
      
      long type         = PositionGetInteger(POSITION_TYPE);
      long magic        = PositionGetInteger(POSITION_MAGIC);
      long time         = PositionGetInteger(POSITION_TIME);
      double volume     = PositionGetDouble(POSITION_VOLUME);
      double price_open = PositionGetDouble(POSITION_PRICE_OPEN);
      double price_curr = PositionGetDouble(POSITION_PRICE_CURRENT);
      double profit     = PositionGetDouble(POSITION_PROFIT);
      double commission = PositionGetDouble(POSITION_COMMISSION);
      double swap       = PositionGetDouble(POSITION_SWAP);
      string symbol     = EscapeJsonString(PositionGetString(POSITION_SYMBOL));
      string comment    = EscapeJsonString(PositionGetString(POSITION_COMMENT));
      
      string pos_json = "    {\n";
      pos_json += "      \"ticket\": \"" + IntegerToString(ticket) + "\",\n";
      pos_json += "      \"time\": " + IntegerToString(time) + ",\n";
      pos_json += "      \"type\": " + IntegerToString(type) + ",\n";
      pos_json += "      \"magic\": " + IntegerToString(magic) + ",\n";
      pos_json += "      \"volume\": " + DoubleToString(volume, 4) + ",\n";
      pos_json += "      \"price_open\": " + DoubleToString(price_open, 5) + ",\n";
      pos_json += "      \"price_current\": " + DoubleToString(price_curr, 5) + ",\n";
      pos_json += "      \"profit\": " + DoubleToString(profit, 2) + ",\n";
      pos_json += "      \"commission\": " + DoubleToString(commission, 2) + ",\n";
      pos_json += "      \"swap\": " + DoubleToString(swap, 2) + ",\n";
      pos_json += "      \"symbol\": \"" + symbol + "\",\n";
      pos_json += "      \"comment\": \"" + comment + "\"\n";
      pos_json += "    }";
      
      if(added_pos_count > 0)
      {
         json = json + ",\n" + pos_json;
      }
      else
      {
         json = json + pos_json;
      }
      added_pos_count++;
   }
   
   json += "\n  ]\n";
   json += "}";
   
   // 3. Send WebRequest to the Dashboard API
   string headers = "Content-Type: application/json\r\nx-api-key: " + InpApiKey + "\r\n";
   char data[];
   char result[];
   string result_headers;
   
   StringToCharArray(json, data, 0, WHOLE_ARRAY, CP_UTF8);
   int data_size = ArraySize(data);
   if(data_size > 0 && data[data_size - 1] == 0)
   {
      ArrayResize(data, data_size - 1);
   }
   
   ResetLastError();
   int timeout = 60000; // 60 seconds timeout
   
   int response_code = WebRequest("POST", InpServerURL, headers, timeout, data, result, result_headers);
   
   if(response_code == 200)
   {
      string response_body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      Print("AccountStatsConnector: Sync succeeded. Server response: ", response_body);
      g_last_sync_time = TimeCurrent();
   }
   else
   {
      Print("AccountStatsConnector Error: Sync failed. HTTP code: ", response_code, " Error code: ", GetLastError());
      if(response_code > 0)
      {
         string response_body = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
         Print("Server response details: ", response_body);
      }
   }
}

//+------------------------------------------------------------------+
//| Escapes quotes and backslashes for JSON compatibility            |
//+------------------------------------------------------------------+
string EscapeJsonString(string str)
{
   string escaped = str;
   StringReplace(escaped, "\\", "\\\\");
   StringReplace(escaped, "\"", "\\\"");
   StringReplace(escaped, "\n", "\\n");
   StringReplace(escaped, "\r", "\\r");
   StringReplace(escaped, "\t", "\\t");
   return escaped;
}
//+------------------------------------------------------------------+
