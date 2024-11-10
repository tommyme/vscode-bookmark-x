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
      src_rg.mv_node_recache_one(src_node, dst_group, strategy);
    } else {
      src_rg.cut_node_recache_all(src_node);
      src_node.uri = dst_group.get_full_uri();
      dst_rg.add_node_recache_all(src_node, strategy);
    }
  }
  public static mvgp2group(
    src_node: Group,
    src_rg: RootGroup,
    dst_group: Group,
    dst_rg: RootGroup,
    strategy: bmutil.AddElStrategy<NodeType> = new bmutil.AddElPushBackStrategy(),
  ) {
    if (src_rg === dst_rg) {
      src_rg.mv_node_recache_one(src_node, dst_group, strategy);
    } else {
      src_rg.cut_node(src_node);
      dst_rg.add_node(src_node, strategy);
      Group.dfsTraverse(src_node, dst_group).forEach((root, fa, node) => {
        let old_key = node.get_full_uri();
        node.uri = fa.get_full_uri();
        let new_key = node.get_full_uri();
        dst_rg.cache.set(new_key, src_rg.cache.pop(old_key));
        dst_rg.vicache.set(new_key, src_rg.vicache.pop(old_key));
      });
    }
  }
  public static mvnode2group(
    src_node: NodeType,
    src_rg: RootGroup,
    dst_group: Group,
    dst_rg: RootGroup,
    strategy: bmutil.AddElStrategy<NodeType> = new bmutil.AddElPushBackStrategy(),
  ) {
    if (src_node instanceof Group) {
      this.mvgp2group(src_node, src_rg, dst_group, dst_rg, strategy);
    } else {
      this.mvbm2group(src_node, src_rg, dst_group, dst_rg, strategy);
    }
  }
}
