import { Bookmark, Group, NodeType, RootGroup } from "./functional_types";
import * as bmutil from "./util";

export class ResourceManager {
  /**
   *
   * 1. cut_node_recache
   * 2. vicache del
   * 3. set new uri
   * 4. add node recache
   */
  public static mvbm2group(
    src_node: NodeType,
    src_rg: RootGroup,
    dst_group: Group,
    dst_rg: RootGroup,
    strategy: bmutil.AddElStrategy<NodeType> = new bmutil.AddElPushBackStrategy(),
  ) {
    if (src_rg === dst_rg) {
      src_rg.mv_bm_recache_all(src_node as Bookmark, dst_group, strategy);
    } else {
      let old_key = src_node.get_full_uri();
      src_rg.cut_node_recache(src_node);
      src_rg.vicache.del(old_key);
      src_node.uri = dst_group.get_full_uri();
      dst_rg.add_node_recache_all(src_node, strategy);
    }
  }
}
