import Models = require("../share/models");
import Utils = require("./utils");
import Interfaces = require("./interfaces");
import Quoter = require("./quoter");

export class MarketFiltration {
    private _latest: Models.Market = null;
    public FilteredMarketChanged = new Utils.Evt<Models.Market>();

    public get latestFilteredMarket() { return this._latest; }
    public set latestFilteredMarket(val: Models.Market) {
        this._latest = val;
        this.FilteredMarketChanged.trigger();
    }

    constructor(private _quoter: Quoter.Quoter,
        private _broker: Interfaces.IMarketDataBroker) {
        _broker.MarketData.on(this.filterFullMarket);
    }

    private filterFullMarket = () => {
        var mkt = this._broker.currentBook;

        if (mkt == null || !mkt.bids.length || !mkt.asks.length) {
            this.latestFilteredMarket = null;
            return;
        }

        var ask = this.filterMarket(mkt.asks, Models.Side.Ask);
        var bid = this.filterMarket(mkt.bids, Models.Side.Bid);

        this.latestFilteredMarket = new Models.Market(bid, ask, mkt.time);
    };

    private filterMarket = (mkts: Models.MarketSide[], s: Models.Side): Models.MarketSide[]=> {
        var rgq = this._quoter.quotesSent(s);

        var copiedMkts = [];
        for (var i = 0; i < mkts.length; i++) {
            copiedMkts.push(new Models.MarketSide(mkts[i].price, mkts[i].size))
        }

        for (var j = 0; j < rgq.length; j++) {
            var q = rgq[j].quote;

            for (var i = 0; i < copiedMkts.length; i++) {
                var m = copiedMkts[i];

                if (Math.abs(q.price - m.price) < 5e-3) {
                    copiedMkts[i].size = m.size - q.size;
                }
            }
        }

        return copiedMkts.filter(m => m.size > 1e-3);
    };
}
